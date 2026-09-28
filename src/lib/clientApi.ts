// 静态模式 API 遮罩：把 /api/* 请求路由到客户端数据引擎，接口形状与服务端完全一致。
import type { NextResponseLike } from './clientTypes';
import { db, save, resetState, auditC, nextLeadId, logSendC } from './clientDb';
import type { Lead, Status } from './types';
import { SOURCES, STATUSES, ALL_PLATFORMS, todayStr, addDays } from './types';
import { parseImport } from './csv';
import { dedupKey, mergeInto } from './dedup';
import { grade, scoreParts } from './scoring';
import { buildMessage } from './copy';
import { computeStats } from './stats';
import { scoreSampleAnswers } from './sample';
import { classifyIntent, INTENT_LABEL } from './classify';
import { authenticate, leadToken, checkLeadToken } from './auth';
import { addActivity, moveStage, setStatus, simSend } from './store';

const HOOK_SECRET = 'onely-hook';
const PUBLIC = new Set(['login', 'webhook', 'webhook/sample', 'unsubscribe']);
const LEAD_ONLY = new Set(['seed', 'leads/bulk', 'leads/export', 'admin/retention']);

function j(data: unknown, status = 200): NextResponseLike {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
function html(body: string, status = 200): NextResponseLike {
  return new Response(body, { status, headers: { 'content-type': 'text/html' } });
}
function csvResp(text: string): NextResponseLike {
  return new Response(text, { headers: { 'content-type': 'text/csv; charset=utf-8' } });
}

function randHex(n: number): string {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleApi(pathWithQuery: string, init: RequestInit): Promise<NextResponseLike> {
  const [pathPart, queryPart] = pathWithQuery.split('?');
  const p = pathPart.replace(/^\/+/, '').replace(/\/+$/, '');
  const q = new URLSearchParams(queryPart ?? '');
  const method = (init.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(String(init.body)) : {};
  const s = db();

  // 认证门（与服务端 dispatcher 同规则）
  if (!PUBLIC.has(p)) {
    if (!s.session) return j({ error: 'unauthorized' }, 401);
    if (LEAD_ONLY.has(p) && s.session.role !== 'lead' && s.session.role !== 'finance') {
      return j({ error: 'forbidden: lead/finance role required' }, 403);
    }
  }
  const actor = s.session?.user ?? 'system';

  /* ---- login ---- */
  if (p === 'login' && method === 'POST') {
    const sess = authenticate(body.user ?? '', body.password ?? '');
    if (!sess) return j({ error: 'bad credentials' }, 401);
    s.session = sess;
    save();
    return j({ ok: true, role: sess.role, user: sess.user });
  }

  /* ---- stats / audit ---- */
  if (p === 'stats') return j(computeStats(s.leads));
  if (p === 'audit') {
    const n = s.corrections.length;
    const deltas = s.corrections.map((c) => Math.abs(c.machine - c.human));
    return j({
      audit: s.audit.slice(0, 50),
      calibration: n
        ? {
            n,
            meanAbsDelta: +(deltas.reduce((a, b) => a + b, 0) / n).toFixed(1),
            within10Pct: Math.round((s.corrections.filter((_, i) => deltas[i] <= 10).length / n) * 100),
          }
        : { n: 0, meanAbsDelta: null, within10Pct: null },
    });
  }

  /* ---- leads 集合 ---- */
  if (p === 'leads' && method === 'GET') {
    let leads = [...s.leads];
    if (q.get('country')) leads = leads.filter((l) => l.country === q.get('country'));
    if (q.get('source')) leads = leads.filter((l) => l.source === q.get('source'));
    if (q.get('tier')) leads = leads.filter((l) => l.tier === q.get('tier'));
    if (q.get('status')) leads = leads.filter((l) => l.status === q.get('status'));
    const kw = (q.get('q') ?? '').toLowerCase();
    if (kw) leads = leads.filter((l) => (l.name + l.city + l.notes + l.role + l.email).toLowerCase().includes(kw));
    leads.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return j({ leads, count: leads.length });
  }
  if (p === 'leads' && method === 'POST') {
    const id = nextLeadId();
    const lead: Lead = {
      id, name: '新线索 ' + id.slice(1), country: 'PH', city: '', source: '手动导入', profile_url: '',
      email: '', phone: '', telegram: '', platforms: [], us_years: 0, english: 'conversational', rating: 0,
      hours_per_week: 0, timezone_overlap: 0, ai_tools: 0, skills: [], role: '', client_type: '', notes: '',
      score: 0, tier: 'C', status: 'new', messages: [], activities: [], created_at: todayStr(),
      last_contact_at: null, next_followup_at: null, dup_count: 0,
    };
    grade(lead);
    addActivity(lead, '手动新建线索');
    s.leads.push(lead);
    save();
    return j({ lead });
  }
  if (p === 'leads/import' && method === 'POST') {
    if (!body.csv || !String(body.csv).trim()) return j({ error: 'empty csv' }, 400);
    let seq = 0;
    for (const l of s.leads) {
      const m = l.id.match(/^L(\d+)$/);
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    }
    const { leads: incoming, invalid, total } = parseImport(body.csv, SOURCES, () => 'L' + String(++seq).padStart(3, '0'));
    const keyIndex = new Map<string, Lead>();
    for (const l of s.leads) {
      const k = dedupKey(l);
      if (k && !keyIndex.has(k)) keyIndex.set(k, l);
    }
    let nw = 0;
    let merged = 0;
    for (const l of incoming) {
      const k = dedupKey(l);
      const hit = k ? keyIndex.get(k) : undefined;
      if (k && hit) {
        mergeInto(hit, l);
        merged += 1;
      } else {
        s.leads.push(l);
        if (k) keyIndex.set(k, l);
        nw += 1;
      }
    }
    save();
    auditC('import', '*', `rows=${total} new=${nw} merged=${merged} invalid=${invalid}`, actor);
    return j({ total, nw, merged, invalid });
  }
  if (p === 'leads/bulk' && method === 'POST') {
    let targets = s.leads;
    if (body.ids?.length) targets = s.leads.filter((l) => body.ids.includes(l.id));
    let n = 0;
    for (const l of targets) {
      if (body.action === 'msg') {
        if (l.status !== 'new') continue;
        const ch = l.email ? 'email' : l.telegram ? 'telegram' : 'facebook';
        const m = buildMessage(l, ch, 0);
        l.messages.push({ channel: ch, seq: 0, subject: m.subject, body: m.body, t: todayStr() });
        n += 1;
      } else {
        grade(l);
        n += 1;
      }
    }
    save();
    return j({ action: body.action === 'msg' ? 'msg' : 'grade', n });
  }
  if (p === 'leads/export' && method === 'GET') {
    let leads = s.leads;
    const ids = q.get('ids');
    if (ids) {
      const set = new Set(ids.split(','));
      leads = leads.filter((l) => set.has(l.id));
    }
    const HEADERS = ['id', 'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram', 'platforms', 'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap', 'ai_tools', 'skills', 'tier', 'score', 'status', 'next_follow_up', 'notes'];
    const esc = (v: unknown) => {
      const str = String(v == null ? '' : v);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = leads.map((l) =>
      [l.id, l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram, l.platforms.join(','), l.us_years, l.english, l.rating, l.hours_per_week, l.timezone_overlap, l.ai_tools ? 'true' : 'false', l.skills.join(','), l.tier, l.score, l.status, l.next_followup_at ?? '', l.notes].map(esc).join(',')
    );
    return csvResp([HEADERS.join(','), ...rows].join('\r\n'));
  }
  if (p === 'seed' && method === 'POST') {
    resetState();
    db().session = s.session;
    save();
    auditC('seed.reset', '*', `leads=${db().leads.length}`, actor);
    return j({ ok: true, leads: db().leads.length });
  }
  if (p === 'admin/retention' && method === 'POST') {
    const days = Math.max(0, Number(body.days ?? 90));
    const cutoff = addDays(todayStr(), -days);
    const targets = s.leads.filter((l) => l.status === 'lost' && l.created_at <= cutoff);
    for (const l of targets) {
      l.name = `Anonymized-${l.id}`;
      l.email = '';
      l.phone = '';
      l.telegram = '';
      l.profile_url = '';
      l.notes = '';
      l.skills = [];
    }
    save();
    auditC('retention.run', '*', `days=${days} anonymized=${targets.length}`, actor);
    return j({ preview: targets.length, anonymized: targets.length, days });
  }

  /* ---- webhooks ---- */
  if (p === 'webhook' && method === 'POST') {
    if ((init.headers as Record<string, string>)?.['x-webhook-key'] !== HOOK_SECRET) return j({ error: 'bad webhook key' }, 401);
    const lead = s.leads.find((l) => (l.email || '').toLowerCase() === String(body.email ?? '').toLowerCase());
    if (!lead) return j({ error: 'lead not found' }, 404);
    if (body.type === 'reply') {
      const intent = classifyIntent(body.text ?? '');
      if (intent === 'refused') {
        setStatus(lead, 'lost');
        addActivity(lead, `Reply intent: ${INTENT_LABEL[intent]} (auto webhook) → lost`);
      } else {
        if (lead.status === 'new' || lead.status === 'contacted') setStatus(lead, 'replied');
        addActivity(lead, `Reply intent: ${INTENT_LABEL[intent]} (auto webhook)`);
      }
      save();
      auditC('webhook.reply', lead.id, intent);
      return j({ intent, status: lead.status });
    }
    if (body.type === 'form') {
      addActivity(lead, 'Screening form received (auto webhook)');
      if (typeof body.quiz_score === 'number' && body.quiz_score >= 4 && ['new', 'contacted', 'replied'].includes(lead.status)) {
        setStatus(lead, 'qualified');
        addActivity(lead, `Quiz ${body.quiz_score}/5 → auto qualified`);
      }
      save();
      auditC('webhook.form', lead.id, `quiz=${body.quiz_score ?? 'n/a'}`);
      return j({ status: lead.status });
    }
    if (body.type === 'sign') {
      setStatus(lead, 'onboarded');
      save();
      auditC('webhook.sign', lead.id, 'e-sign complete');
      return j({ status: lead.status });
    }
    return j({ error: 'unknown webhook type' }, 400);
  }
  if (p === 'webhook/sample' && method === 'POST') {
    const row = s.samples.find((x) => x.token === body.token);
    if (!row) return j({ error: 'bad token' }, 404);
    const answers = (body.answers ?? []).map(String).slice(0, 3);
    if (answers.length < 3 || answers.some((a: string) => a.trim().length < 20)) {
      return j({ error: 'three answers of reasonable length required' }, 400);
    }
    const { score, parts } = scoreSampleAnswers(answers);
    row.submitted_at = todayStr();
    row.answers = answers;
    row.machine_score = score;
    row.machine_parts = parts;
    row.status = 'submitted';
    const lead = s.leads.find((l) => l.id === row.lead_id);
    if (lead) {
      addActivity(lead, `Sample task submitted, machine score ${score}/100 (auto)`);
      if (score < 60) addActivity(lead, 'Machine score < 60: suggest waitlist / polite decline');
    }
    save();
    auditC('webhook.sample', row.lead_id, `machine=${score}`);
    return j({ score, parts });
  }
  if (p === 'unsubscribe' && method === 'GET') {
    const t = q.get('t') ?? '';
    const lead = s.leads.find((l) => checkLeadToken(l.id, t));
    const BAD = `<!doctype html><html><meta charset="utf-8"><title>Invalid link</title><body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh"><div><h2>Invalid unsubscribe link</h2></div></body></html>`;
    const OK = `<!doctype html><html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h2>You're unsubscribed</h2><p style="color:#b39e98">No further messages will be sent to you.</p></div></body></html>`;
    if (!lead) return html(BAD, 404);
    if (lead.status !== 'lost') {
      lead.status = 'lost';
      addActivity(lead, 'Unsubscribed via link (auto)');
      save();
      auditC('unsubscribe', lead.id, 'via email footer link');
    }
    return html(OK);
  }

  /* ---- leads/:id 及子资源 ---- */
  const mId = p.match(/^leads\/([^/]+)$/);
  if (mId && method === 'PATCH') {
    const lead = s.leads.find((l) => l.id === mId[1]);
    if (!lead) return j({ error: 'not found' }, 404);
    const EDITABLE = ['name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram', 'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap', 'ai_tools', 'role', 'client_type', 'notes'];
    for (const k of EDITABLE) if (body[k] !== undefined) (lead as unknown as Record<string, unknown>)[k] = body[k];
    if (body.platforms !== undefined) {
      const arr = Array.isArray(body.platforms) ? body.platforms : String(body.platforms).split(',').map((x: string) => x.trim().toLowerCase());
      lead.platforms = arr.filter((x: string) => ALL_PLATFORMS.includes(x));
    }
    if (body.status && STATUSES.some((x) => x.key === body.status)) setStatus(lead, body.status as Status);
    grade(lead);
    addActivity(lead, '资料编辑并重新评分：' + lead.score + ' 分（' + lead.tier + '）');
    save();
    auditC('lead.edit', lead.id, `${lead.score}/${lead.tier}`, actor);
    return j({ lead });
  }
  const mStage = p.match(/^leads\/([^/]+)\/stage$/);
  if (mStage && method === 'POST') {
    const lead = s.leads.find((l) => l.id === mStage[1]);
    if (!lead) return j({ error: 'not found' }, 404);
    if (body.status && STATUSES.some((x) => x.key === body.status)) setStatus(lead, body.status as Status);
    else if (!moveStage(lead, body.dir === -1 ? -1 : 1)) return j({ error: 'stage boundary' }, 400);
    save();
    auditC('stage', lead.id, lead.status, actor);
    return j({ lead });
  }
  const mMsg = p.match(/^leads\/([^/]+)\/message$/);
  if (mMsg && method === 'POST') {
    const lead = s.leads.find((l) => l.id === mMsg[1]);
    if (!lead) return j({ error: 'not found' }, 404);
    const channel = body.channel || (lead.email ? 'email' : lead.telegram ? 'telegram' : 'facebook');
    const seq = body.seq === 1 || body.seq === 2 ? body.seq : 0;
    const cap = Number(100);
    const used = s.sends.filter((x) => x.channel === channel && x.day === todayStr()).length;
    if (used >= cap) return j({ error: `rate limit: ${channel} ${used}/${cap} today` }, 429);
    const msg = simSend(lead, channel, seq);
    logSendC(channel);
    save();
    auditC('send', lead.id, `${channel}/seq${seq}/simulated`, actor);
    return j({ lead, msg, send: { mode: 'simulated' } });
  }
  const mSample = p.match(/^leads\/([^/]+)\/sample$/);
  if (mSample) {
    const id = mSample[1];
    if (method === 'GET') {
      const row = s.samples.find((x) => x.lead_id === id);
      return j({ sample: row ?? null });
    }
    const lead = s.leads.find((l) => l.id === id);
    if (!lead) return j({ error: 'not found' }, 404);
    if (body.action === 'send') {
      let row = s.samples.find((x) => x.lead_id === id);
      if (!row) {
        row = { lead_id: id, token: randHex(12), sent_at: todayStr(), submitted_at: null, answers: [], machine_score: null, machine_parts: [], human_score: null, status: 'sent' };
        s.samples.push(row);
      } else {
        row.sent_at = todayStr();
        row.status = 'sent';
      }
      addActivity(lead, 'Sample task sent (3 scripted fan messages, 15 min)');
      save();
      auditC('sample.send', id, row.token.slice(0, 6) + '…', actor);
      const base = process.env.NEXT_PUBLIC_STATIC === '1' ? '/onely-recruiter' : '';
      return j({ token: row.token, url: `${base}/sample?t=${row.token}` });
    }
    if (body.action === 'correct') {
      const row = s.samples.find((x) => x.lead_id === id);
      if (!row || row.machine_score == null) return j({ error: 'no machine score yet' }, 400);
      const human = Math.max(0, Math.min(100, Number(body.human_score) || 0));
      row.human_score = human;
      s.corrections.push({ id: s.corrections.length + 1, lead_id: id, machine: row.machine_score, human, delta: human - row.machine_score, ts: new Date().toISOString(), actor });
      addActivity(lead, `Human correction: machine ${row.machine_score} → human ${human}`);
      save();
      auditC('sample.correct', id, `${row.machine_score}→${human}`, actor);
      return j({ ok: true });
    }
    return j({ error: 'unknown action' }, 400);
  }

  return j({ error: 'not found' }, 404);
}

export { scoreParts };

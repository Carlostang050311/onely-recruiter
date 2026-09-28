// API 核心处理器：所有 /api/* 逻辑集中于此，由 app/api/[...slug] 单一路由分发。
// 目的：无服务器部署的函数数量上限（匿名部署 20 个）下保持单函数；URL 与行为不变。
import { NextRequest, NextResponse } from 'next/server';
import { getDb, resetDb } from './db';
import { allLeads, getLead, insertLead, saveLead, regrade, addActivity, setStatus, moveStage, simSend, nextLeadIds } from './store';
import { parseImport } from './csv';
import { dedupKey, mergeInto } from './dedup';
import { buildMessage } from './copy';
import { computeStats } from './stats';
import { SOURCES, STATUSES, ALL_PLATFORMS, todayStr, rowToLead } from './types';
import type { Lead, LeadRow, Status } from './types';
import { authenticate, signSession, COOKIE, checkLeadToken } from './auth';
import { audit, recentAudit } from './audit';
import { calibrationStats, scoreSampleAnswers } from './sample';
import { anonymizeStale, retentionPreview } from './retention';
import { checkRateLimit, sendOutreach, logSend } from './sender';
import { classifyIntent, INTENT_LABEL } from './classify';
import { randomBytes } from 'node:crypto';

const json = NextResponse.json;

/* ---------- leads ---------- */
export async function leadsGet(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = getDb();
  const where: string[] = [];
  const args: (string | number)[] = [];
  const eq: [string, string | null][] = [
    ['country', sp.get('country')],
    ['source', sp.get('source')],
    ['tier', sp.get('tier')],
    ['status', sp.get('status')],
  ];
  for (const [col, v] of eq) {
    if (v) {
      where.push(`${col} = ?`);
      args.push(v);
    }
  }
  const q = (sp.get('q') ?? '').toLowerCase();
  if (q) {
    where.push('(name LIKE ? OR city LIKE ? OR notes LIKE ? OR role LIKE ? OR email LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like, like);
  }
  const sql = `SELECT * FROM leads${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id ASC`;
  const rows = db.prepare(sql).all(...args) as unknown as LeadRow[];
  return json({ leads: rows.map(rowToLead), count: rows.length });
}

export async function leadsPost() {
  const db = getDb();
  const [id] = nextLeadIds(db, 1);
  const lead: Lead = {
    id,
    name: '新线索 ' + id.slice(1),
    country: 'PH',
    city: '',
    source: '手动导入',
    profile_url: '',
    email: '',
    phone: '',
    telegram: '',
    platforms: [],
    us_years: 0,
    english: 'conversational',
    rating: 0,
    hours_per_week: 0,
    timezone_overlap: 0,
    ai_tools: 0,
    skills: [],
    role: '',
    client_type: '',
    notes: '',
    score: 0,
    tier: 'C',
    status: 'new',
    messages: [],
    activities: [],
    created_at: todayStr(),
    last_contact_at: null,
    next_followup_at: null,
    dup_count: 0,
  };
  regrade(lead);
  addActivity(lead, '手动新建线索');
  insertLead(db, lead);
  return json({ lead });
}

export async function importPost(req: NextRequest, actor: string) {
  const body = (await req.json()) as { csv?: string; filename?: string };
  if (!body.csv || !body.csv.trim()) return json({ error: 'empty csv' }, { status: 400 });
  const db = getDb();
  let seq = 0;
  {
    const rows = db.prepare('SELECT id FROM leads').all() as { id: string }[];
    for (const r of rows) {
      const m = r.id.match(/^L(\d+)$/);
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    }
  }
  const idGen = () => 'L' + String(++seq).padStart(3, '0');
  const { leads: incoming, invalid, total } = parseImport(body.csv, SOURCES, idGen);
  const existing = allLeads(db);
  const keyIndex = new Map<string, Lead>();
  for (const l of existing) {
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
      saveLead(db, hit);
      merged += 1;
    } else {
      insertLead(db, l);
      if (k) keyIndex.set(k, l);
      nw += 1;
    }
  }
  db.prepare('INSERT INTO imports (filename, total_rows, inserted, duplicates, created_at) VALUES (?,?,?,?,?)').run(
    body.filename ?? 'paste.csv',
    total,
    nw,
    merged,
    todayStr()
  );
  audit(db, actor, 'import', '*', `rows=${total} new=${nw} merged=${merged} invalid=${invalid}`);
  return json({ total, nw, merged, invalid });
}

function esc(v: unknown): string {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportGet(req: NextRequest) {
  let leads = allLeads(getDb());
  const ids = req.nextUrl.searchParams.get('ids');
  if (ids) {
    const set = new Set(ids.split(','));
    leads = leads.filter((l) => set.has(l.id));
  }
  const HEADERS = [
    'id', 'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram',
    'platforms', 'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap',
    'ai_tools', 'skills', 'tier', 'score', 'status', 'next_follow_up', 'notes',
  ];
  const rowOf = (l: Lead): string[] => [
    l.id, l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram,
    l.platforms.join(','), String(l.us_years), l.english, String(l.rating), String(l.hours_per_week),
    String(l.timezone_overlap), l.ai_tools ? 'true' : 'false', l.skills.join(','),
    l.tier, String(l.score), l.status, l.next_followup_at ?? '', l.notes,
  ];
  const csv = [HEADERS.join(','), ...leads.map((l) => rowOf(l).map(esc).join(','))].join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="onely_leads_export.csv"',
    },
  });
}

export async function bulkPost(req: NextRequest) {
  const body = (await req.json()) as { ids?: string[]; action?: 'grade' | 'msg' };
  const db = getDb();
  let leads = allLeads(db);
  if (body.ids && body.ids.length) {
    const set = new Set(body.ids);
    leads = leads.filter((l) => set.has(l.id));
  }
  const action = body.action === 'msg' ? 'msg' : 'grade';
  let n = 0;
  for (const l of leads) {
    if (action === 'grade') {
      regrade(l);
      saveLead(db, l);
      n += 1;
    } else if (l.status === 'new') {
      const ch = l.email ? 'email' : l.telegram ? 'telegram' : 'facebook';
      const m = buildMessage(l, ch, 0);
      l.messages = [...l.messages, { channel: ch, seq: 0, subject: m.subject, body: m.body, t: todayStr() }];
      saveLead(db, l);
      n += 1;
    }
  }
  return json({ action, n });
}

/* ---------- lead by id ---------- */
const EDITABLE = [
  'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram',
  'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap', 'ai_tools',
  'role', 'client_type', 'notes',
] as const;

export async function leadPatch(req: NextRequest, id: string, actor: string) {
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return json({ error: 'not found' }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown> & { platforms?: string | string[]; status?: Status };
  for (const k of EDITABLE) {
    if (body[k] !== undefined) (lead as unknown as Record<string, unknown>)[k] = body[k] as never;
  }
  if (body.platforms !== undefined) {
    const arr = Array.isArray(body.platforms)
      ? body.platforms
      : String(body.platforms).split(',').map((s) => s.trim().toLowerCase());
    lead.platforms = arr.filter((s) => ALL_PLATFORMS.includes(s));
  }
  if (body.status && STATUSES.some((s) => s.key === body.status)) setStatus(lead, body.status);
  regrade(lead);
  if (Object.keys(body).some((k) => (EDITABLE as readonly string[]).includes(k) || k === 'platforms')) {
    addActivity(lead, '资料编辑并重新评分：' + lead.score + ' 分（' + lead.tier + '）');
  }
  audit(db, actor, 'lead.edit', id, `${lead.score}/${lead.tier}`);
  saveLead(db, lead);
  return json({ lead });
}

export async function stagePost(req: NextRequest, id: string, actor: string) {
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return json({ error: 'not found' }, { status: 404 });
  const body = (await req.json()) as { dir?: number; status?: Status };
  if (body.status && STATUSES.some((s) => s.key === body.status)) {
    setStatus(lead, body.status);
  } else {
    const ok = moveStage(lead, body.dir === -1 ? -1 : 1);
    if (!ok) return json({ error: 'stage boundary' }, { status: 400 });
  }
  audit(db, actor, 'stage', id, lead.status);
  saveLead(db, lead);
  return json({ lead });
}

export async function messagePost(req: NextRequest, id: string, actor: string) {
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return json({ error: 'not found' }, { status: 404 });
  const body = (await req.json()) as { channel?: string; seq?: number };
  const channel = body.channel || (lead.email ? 'email' : lead.telegram ? 'telegram' : 'facebook');
  const seq = body.seq === 1 || body.seq === 2 ? body.seq : 0;
  const rl = checkRateLimit(db, channel);
  if (!rl.ok) return json({ error: `rate limit: ${channel} ${rl.used}/${rl.cap} today` }, { status: 429 });
  const msg = simSend(lead, channel, seq);
  const base = process.env.APP_BASE || 'http://localhost:3777';
  const result = await sendOutreach(db, lead, channel, msg.subject, msg.body, base);
  if (result.mode === 'simulated') logSend(db, lead.id, channel, 'simulated');
  saveLead(db, lead);
  audit(db, actor, 'send', id, `${channel}/seq${seq}/${result.mode}${result.error ? ' err=' + result.error : ''}`);
  return json({ lead, msg, send: result });
}

export async function sampleGet(id: string) {
  const row = getDb().prepare('SELECT * FROM samples WHERE lead_id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return json({ sample: null });
  return json({
    sample: {
      ...row,
      answers: JSON.parse(String(row.answers ?? '[]')),
      machine_parts: JSON.parse(String(row.machine_parts ?? '[]')),
    },
  });
}

export async function samplePost(req: NextRequest, id: string, actor: string) {
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return json({ error: 'not found' }, { status: 404 });
  const body = (await req.json()) as { action?: string; human_score?: number };
  if (body.action === 'send') {
    const existing = db.prepare('SELECT token FROM samples WHERE lead_id = ?').get(id) as { token: string } | undefined;
    const token = existing?.token ?? randomBytes(12).toString('hex');
    if (existing) {
      db.prepare("UPDATE samples SET sent_at = ?, status = 'sent' WHERE lead_id = ?").run(todayStr(), id);
    } else {
      db.prepare('INSERT INTO samples (lead_id, token, sent_at, status) VALUES (?,?,?,?)').run(id, token, todayStr(), 'sent');
    }
    addActivity(lead, 'Sample task sent (3 scripted fan messages, 15 min)');
    saveLead(db, lead);
    audit(db, actor, 'sample.send', id, token.slice(0, 6) + '…');
    const base = process.env.APP_BASE || 'http://localhost:3777';
    return json({ token, url: `${base}/sample?t=${token}` });
  }
  if (body.action === 'correct') {
    const row = db.prepare('SELECT machine_score FROM samples WHERE lead_id = ?').get(id) as
      | { machine_score: number | null }
      | undefined;
    if (!row || row.machine_score == null) return json({ error: 'no machine score yet' }, { status: 400 });
    const human = Math.max(0, Math.min(100, Number(body.human_score) || 0));
    db.prepare('UPDATE samples SET human_score = ? WHERE lead_id = ?').run(human, id);
    db.prepare('INSERT INTO corrections (lead_id, machine, human, delta, ts, actor) VALUES (?,?,?,?,?,?)').run(
      id, row.machine_score, human, human - row.machine_score, new Date().toISOString(), actor
    );
    addActivity(lead, `Human correction: machine ${row.machine_score} → human ${human}`);
    saveLead(db, lead);
    audit(db, actor, 'sample.correct', id, `${row.machine_score}→${human}`);
    return json({ ok: true });
  }
  return json({ error: 'unknown action' }, { status: 400 });
}

/* ---------- webhooks ---------- */
const HOOK_SECRET = process.env.WEBHOOK_SECRET || 'onely-hook';

export async function webhookPost(req: NextRequest) {
  if (req.headers.get('x-webhook-key') !== HOOK_SECRET) return json({ error: 'bad webhook key' }, { status: 401 });
  const body = (await req.json()) as { type?: string; email?: string; text?: string; quiz_score?: number };
  const db = getDb();
  const norm = (body.email ?? '').trim().toLowerCase();
  const lead = allLeads(db).find((l) => (l.email || '').trim().toLowerCase() === norm) ?? null;
  if (!lead) return json({ error: 'lead not found' }, { status: 404 });
  if (body.type === 'reply') {
    const intent = classifyIntent(body.text ?? '');
    if (intent === 'refused') {
      setStatus(lead, 'lost');
      addActivity(lead, `Reply intent: ${INTENT_LABEL[intent]} (auto webhook) → lost`);
    } else {
      if (lead.status === 'new' || lead.status === 'contacted') setStatus(lead, 'replied');
      addActivity(lead, `Reply intent: ${INTENT_LABEL[intent]} (auto webhook)`);
    }
    saveLead(db, lead);
    audit(db, 'system', 'webhook.reply', lead.id, intent);
    return json({ intent, status: lead.status });
  }
  if (body.type === 'form') {
    addActivity(lead, 'Screening form received (auto webhook)');
    if (typeof body.quiz_score === 'number' && body.quiz_score >= 4) {
      if (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'replied') {
        setStatus(lead, 'qualified');
        addActivity(lead, `Quiz ${body.quiz_score}/5 → auto qualified`);
      }
    }
    saveLead(db, lead);
    audit(db, 'system', 'webhook.form', lead.id, `quiz=${body.quiz_score ?? 'n/a'}`);
    return json({ status: lead.status });
  }
  if (body.type === 'sign') {
    setStatus(lead, 'onboarded');
    saveLead(db, lead);
    audit(db, 'system', 'webhook.sign', lead.id, 'e-sign complete');
    return json({ status: lead.status });
  }
  return json({ error: 'unknown webhook type' }, { status: 400 });
}

export async function webhookSamplePost(req: NextRequest) {
  const body = (await req.json()) as { token?: string; answers?: string[] };
  const token = body.token ?? '';
  const db = getDb();
  const row = db.prepare('SELECT * FROM samples WHERE token = ?').get(token) as { lead_id: string } | undefined;
  if (!row) return json({ error: 'bad token' }, { status: 404 });
  const answers = (body.answers ?? []).map((a) => String(a)).slice(0, 3);
  if (answers.length < 3 || answers.some((a) => a.trim().length < 20)) {
    return json({ error: 'three answers of reasonable length required' }, { status: 400 });
  }
  const { score, parts } = scoreSampleAnswers(answers);
  db.prepare(
    'UPDATE samples SET submitted_at = ?, answers = ?, machine_score = ?, machine_parts = ?, status = ? WHERE token = ?'
  ).run(todayStr(), JSON.stringify(answers), score, JSON.stringify(parts), 'submitted', token);
  const lead = getLead(db, row.lead_id);
  if (lead) {
    addActivity(lead, `Sample task submitted, machine score ${score}/100 (auto)`);
    if (score < 60) addActivity(lead, 'Machine score < 60: suggest waitlist / polite decline');
    saveLead(db, lead);
  }
  audit(db, 'system', 'webhook.sample', row.lead_id, `machine=${score}`);
  return json({ score, parts });
}

/* ---------- misc ---------- */
export async function unsubscribeGet(req: NextRequest) {
  const t = req.nextUrl.searchParams.get('t') ?? '';
  const db = getDb();
  let lead: Lead | null = null;
  for (const l of allLeads(db)) {
    if (await checkLeadToken(l.id, t)) {
      lead = l;
      break;
    }
  }
  const PAGE_BAD = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title><body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh"><div><h2>Invalid unsubscribe link</h2></div></body></html>`;
  const PAGE_OK = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:sans-serif;background:#151012;color:#f2e8e3;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h2>You're unsubscribed</h2><p style="color:#b39e98">No further messages will be sent to you. Sorry for the noise.</p></div></body></html>`;
  if (!lead) return new NextResponse(PAGE_BAD, { status: 404, headers: { 'content-type': 'text/html' } });
  if (lead.status !== 'lost') {
    lead.status = 'lost';
    addActivity(lead, 'Unsubscribed via link (auto)');
    saveLead(db, lead);
    audit(db, 'system', 'unsubscribe', lead.id, 'via email footer link');
  }
  return new NextResponse(PAGE_OK, { headers: { 'content-type': 'text/html' } });
}

export async function loginPost(req: NextRequest) {
  const body = (await req.json()) as { user?: string; password?: string };
  const session = authenticate(body.user ?? '', body.password ?? '');
  if (!session) return json({ error: 'bad credentials' }, { status: 401 });
  const token = await signSession({ ...session, exp: Date.now() + 12 * 3600_000 });
  const res = json({ ok: true, role: session.role, user: session.user });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
  return res;
}

export async function auditGet() {
  const db = getDb();
  return json({ audit: recentAudit(db, 50), calibration: calibrationStats(db) });
}

export async function retentionPost(req: NextRequest, actor: string) {
  const db = getDb();
  const body = (await req.json().catch(() => ({}))) as { days?: number };
  const days = Math.max(0, Number(body.days ?? 90));
  const preview = retentionPreview(db, days);
  const n = anonymizeStale(db, days);
  audit(db, actor, 'retention.run', '*', `days=${days} anonymized=${n}`);
  return json({ preview, anonymized: n, days });
}

export async function statsGet() {
  return json(computeStats(allLeads(getDb())));
}

export async function seedPost(actor: string) {
  resetDb();
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM leads').get() as { n: number };
  audit(getDb(), actor, 'seed.reset', '*', `leads=${row.n}`);
  return json({ ok: true, leads: row.n });
}

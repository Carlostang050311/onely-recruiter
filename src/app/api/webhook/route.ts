// 事件 webhook（x-webhook-key 校验），body.type 区分事件：
// { type:'reply', email, text }        → 意图分类；拒绝→流失，其余→已回复
// { type:'form',  email, quiz_score? } → 筛选表回收；quiz_score≥4 自动通过筛选
// { type:'sign',  email }              → 电子签完成→已入驻
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { allLeads, saveLead, addActivity, setStatus } from '../../../lib/store';
import { classifyIntent, INTENT_LABEL } from '../../../lib/classify';
import { audit } from '../../../lib/audit';

export const dynamic = 'force-dynamic';

const HOOK_SECRET = process.env.WEBHOOK_SECRET || 'onely-hook';

function authorized(req: NextRequest): boolean {
  return req.headers.get('x-webhook-key') === HOOK_SECRET;
}

function findLead(email: string) {
  const norm = email.trim().toLowerCase();
  return allLeads(getDb()).find((l) => (l.email || '').trim().toLowerCase() === norm) ?? null;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'bad webhook key' }, { status: 401 });
  const body = (await req.json()) as { type?: string; email?: string; text?: string; quiz_score?: number };
  const db = getDb();
  const lead = findLead(body.email ?? '');
  if (!lead) return NextResponse.json({ error: 'lead not found' }, { status: 404 });

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
    return NextResponse.json({ intent, status: lead.status });
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
    return NextResponse.json({ status: lead.status });
  }

  if (body.type === 'sign') {
    setStatus(lead, 'onboarded');
    saveLead(db, lead);
    audit(db, 'system', 'webhook.sign', lead.id, 'e-sign complete');
    return NextResponse.json({ status: lead.status });
  }

  return NextResponse.json({ error: 'unknown webhook type' }, { status: 400 });
}

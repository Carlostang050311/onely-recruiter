// POST /api/webhook/sample  { token, answers: string[3] } —— 样题提交（token 即密钥，公开）
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { getLead, saveLead, addActivity } from '../../../../lib/store';
import { scoreSampleAnswers } from '../../../../lib/sample';
import { audit } from '../../../../lib/audit';
import { todayStr } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { token?: string; answers?: string[] };
  const token = body.token ?? '';
  const db = getDb();
  const row = db.prepare('SELECT * FROM samples WHERE token = ?').get(token) as
    | { lead_id: string; status: string }
    | undefined;
  if (!row) return NextResponse.json({ error: 'bad token' }, { status: 404 });
  const answers = (body.answers ?? []).map((a) => String(a)).slice(0, 3);
  if (answers.length < 3 || answers.some((a) => a.trim().length < 20)) {
    return NextResponse.json({ error: 'three answers of reasonable length required' }, { status: 400 });
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
  return NextResponse.json({ score, parts });
}

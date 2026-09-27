// POST /api/leads/bulk  body: { ids?: string[], action: 'grade' | 'msg' }
// grade：对选中（或当前筛选全量）重新评分分级；msg：为选中的新线索生成首触文案（不发送）
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { allLeads, saveLead, regrade } from '../../../../lib/store';
import { buildMessage } from '../../../../lib/copy';
import { todayStr } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
  return NextResponse.json({ action, n });
}

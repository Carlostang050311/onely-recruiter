// POST /api/outreach/generate  body: { ids: number[], day: 0|1|2 }
// 按渠道模板生成个性化文案并写回线索；返回供 UI 预览。
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { generateMessage } from '../../../lib/copy';
import type { LeadRow } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { ids?: number[]; day?: 0 | 1 | 2 };
  const ids = (body.ids ?? []).map(Number).filter((n) => Number.isInteger(n));
  const day = body.day === 1 ? 1 : body.day === 2 ? 2 : 0;
  if (!ids.length) return NextResponse.json({ error: 'no ids' }, { status: 400 });

  const db = getDb();
  const select = db.prepare('SELECT * FROM leads WHERE id = ?');
  const update = db.prepare('UPDATE leads SET outreach_message = ?, outreach_day = ? WHERE id = ?');
  const out: { id: number; name: string; tier: string | null; channel: string; subject?: string; body: string }[] = [];

  for (const id of ids) {
    const lead = select.get(id) as LeadRow | undefined;
    if (!lead) continue;
    const msg = generateMessage(lead, day);
    const stored = msg.subject ? `Subject: ${msg.subject}\n\n${msg.body}` : msg.body;
    update.run(stored, day, id);
    out.push({
      id,
      name: `${lead.first_name} ${lead.last_name}`.trim(),
      tier: lead.tier,
      channel: lead.channel,
      subject: msg.subject,
      body: msg.body,
    });
  }
  return NextResponse.json({ generated: out.length, day, messages: out });
}

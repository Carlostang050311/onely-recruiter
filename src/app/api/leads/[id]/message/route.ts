// POST /api/leads/[id]/message  body: { channel, seq? } —— 模拟发送并排跟进
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';
import { getLead, saveLead, simSend } from '../../../../../lib/store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as { channel?: string; seq?: number };
  const channel = body.channel || (lead.email ? 'email' : lead.telegram ? 'telegram' : 'facebook');
  const seq = body.seq === 1 || body.seq === 2 ? body.seq : 0;
  const msg = simSend(lead, channel, seq);
  saveLead(db, lead);
  return NextResponse.json({ lead, msg });
}

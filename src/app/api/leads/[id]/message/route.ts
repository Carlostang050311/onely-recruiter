// POST /api/leads/[id]/message  body: { channel, seq? } —— 发送（配置凭据时真发，否则模拟）+ 限频 + 审计
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';
import { getLead, saveLead, simSend } from '../../../../../lib/store';
import { checkRateLimit, sendOutreach, logSend } from '../../../../../lib/sender';
import { audit } from '../../../../../lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as { channel?: string; seq?: number };
  const channel = body.channel || (lead.email ? 'email' : lead.telegram ? 'telegram' : 'facebook');
  const seq = body.seq === 1 || body.seq === 2 ? body.seq : 0;

  const rl = checkRateLimit(db, channel);
  if (!rl.ok) {
    return NextResponse.json({ error: `rate limit: ${channel} ${rl.used}/${rl.cap} today` }, { status: 429 });
  }

  const actor = req.headers.get('x-auth-user') ?? 'system';
  const msg = simSend(lead, channel, seq);
  const base = process.env.APP_BASE || 'http://localhost:3777';
  const result = await sendOutreach(db, lead, channel, msg.subject, msg.body, base);
  if (result.mode === 'simulated') logSend(db, lead.id, channel, 'simulated');
  saveLead(db, lead);
  audit(db, actor, 'send', lead.id, `${channel}/seq${seq}/${result.mode}${result.error ? ' err=' + result.error : ''}`);
  return NextResponse.json({ lead, msg, send: result });
}

// POST /api/leads/[id]/stage  body: { dir: 1 | -1 } 或 { status }
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';
import { getLead, saveLead, moveStage, setStatus } from '../../../../../lib/store';
import type { Status } from '../../../../../lib/types';
import { STATUSES } from '../../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as { dir?: number; status?: Status };
  if (body.status && STATUSES.some((s) => s.key === body.status)) {
    setStatus(lead, body.status);
  } else {
    const ok = moveStage(lead, body.dir === -1 ? -1 : 1);
    if (!ok) return NextResponse.json({ error: 'stage boundary' }, { status: 400 });
  }
  saveLead(db, lead);
  return NextResponse.json({ lead });
}

// PATCH /api/leads/[id]  body: { status?: string, notes?: string }
// 推进状态时写入对应时间戳，并维护跟进提醒。
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import type { LeadRow, Status } from '../../../../lib/types';
import { STATUS_TS } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) return NextResponse.json({ error: 'bad id' }, { status: 400 });

  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as LeadRow | undefined;
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as { status?: Status; notes?: string };
  const now = new Date().toISOString();
  const updates: string[] = [];
  const args: (string | number | null)[] = [];

  if (body.status) {
    updates.push('status = ?');
    args.push(body.status);
    const tsField = body.status !== 'new' ? STATUS_TS[body.status] : null;
    if (tsField && !lead[tsField as keyof LeadRow]) {
      updates.push(`${tsField} = ?`);
      args.push(now);
    }
    if (body.status === 'contacted' && !lead.next_followup_at) {
      updates.push('next_followup_at = ?');
      args.push(new Date(Date.now() + 24 * 3600_000).toISOString());
    }
    if (['replied', 'onboarded', 'rejected'].includes(body.status) && lead.next_followup_at) {
      updates.push('next_followup_at = ?');
      args.push(null);
    }
  }
  if (typeof body.notes === 'string') {
    updates.push('notes = ?');
    args.push(body.notes);
  }

  if (updates.length) {
    args.push(leadId);
    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...args);
  }
  const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as unknown as LeadRow;
  return NextResponse.json({ lead: updated });
}

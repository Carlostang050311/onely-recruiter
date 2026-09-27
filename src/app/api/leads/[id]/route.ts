// PATCH /api/leads/[id] —— 抽屉「编辑」保存 / 状态直改；保存后重新评分并记动态
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { getLead, saveLead, regrade, addActivity, setStatus } from '../../../../lib/store';
import type { Lead, Status } from '../../../../lib/types';
import { ALL_PLATFORMS, STATUSES } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

const EDITABLE = [
  'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram',
  'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap', 'ai_tools',
  'role', 'client_type', 'notes',
] as const;

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown> & { platforms?: string | string[]; status?: Status };

  for (const k of EDITABLE) {
    if (body[k] !== undefined) {
      (lead as unknown as Record<string, unknown>)[k] = body[k] as never;
    }
  }
  if (body.platforms !== undefined) {
    const arr = Array.isArray(body.platforms)
      ? body.platforms
      : String(body.platforms).split(',').map((s) => s.trim().toLowerCase());
    lead.platforms = arr.filter((s) => ALL_PLATFORMS.includes(s));
  }
  if (body.status && STATUSES.some((s) => s.key === body.status)) {
    setStatus(lead, body.status);
  }

  regrade(lead);
  if (Object.keys(body).some((k) => EDITABLE.includes(k as (typeof EDITABLE)[number]) || k === 'platforms')) {
    addActivity(lead, '资料编辑并重新评分：' + lead.score + ' 分（' + lead.tier + '）');
  }
  saveLead(db, lead);
  return NextResponse.json({ lead });
}

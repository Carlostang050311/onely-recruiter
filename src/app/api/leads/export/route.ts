// GET /api/leads/export → 全量线索 CSV（含生成的触达文案）
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import type { LeadRow } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

function esc(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const rows = getDb().prepare('SELECT * FROM leads ORDER BY id').all() as unknown as LeadRow[];
  const header = [
    'id', 'first_name', 'last_name', 'email', 'handle', 'location', 'channel', 'platforms',
    'score', 'tier', 'status', 'english_sample', 'hours_per_week',
    'contacted_at', 'replied_at', 'applied_at', 'sample_done_at', 'offered_at', 'onboarded_at', 'rejected_at',
    'next_followup_at', 'outreach_day', 'outreach_message', 'notes',
  ];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(header.map((h) => esc((r as unknown as Record<string, unknown>)[h])).join(','));
  }
  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="onely-leads-export.csv"',
    },
  });
}

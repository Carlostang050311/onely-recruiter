// GET /api/leads/export → 全量（或 ?ids= 指定）线索 CSV，列与参照稿一致
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { allLeads } from '../../../../lib/store';
import type { Lead } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

const HEADERS = [
  'id', 'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram',
  'platforms', 'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap',
  'ai_tools', 'skills', 'tier', 'score', 'status', 'next_follow_up', 'notes',
];

function esc(v: unknown): string {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowOf(l: Lead): string[] {
  return [
    l.id, l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram,
    l.platforms.join(','), String(l.us_years), l.english, String(l.rating), String(l.hours_per_week),
    String(l.timezone_overlap), l.ai_tools ? 'true' : 'false', l.skills.join(','),
    l.tier, String(l.score), l.status, l.next_followup_at ?? '', l.notes,
  ];
}

export async function GET(req: NextRequest) {
  let leads = allLeads(getDb());
  const ids = req.nextUrl.searchParams.get('ids');
  if (ids) {
    const set = new Set(ids.split(','));
    leads = leads.filter((l) => set.has(l.id));
  }
  const csv = [HEADERS.join(','), ...leads.map((l) => rowOf(l).map(esc).join(','))].join('\r\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="onely_leads_export.csv"',
    },
  });
}

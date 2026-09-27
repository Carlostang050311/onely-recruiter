// GET /api/leads?country=&source=&tier=&status=&q= ；POST /api/leads 新建线索
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { allLeads, insertLead, regrade, addActivity, nextLeadIds } from '../../../lib/store';
import type { Lead } from '../../../lib/types';
import { todayStr } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let leads = allLeads(getDb());
  const country = sp.get('country');
  const source = sp.get('source');
  const tier = sp.get('tier');
  const status = sp.get('status');
  const q = (sp.get('q') ?? '').toLowerCase();
  if (country) leads = leads.filter((l) => l.country === country);
  if (source) leads = leads.filter((l) => l.source === source);
  if (tier) leads = leads.filter((l) => l.tier === tier);
  if (status) leads = leads.filter((l) => l.status === status);
  if (q)
    leads = leads.filter((l) =>
      (l.name + l.city + l.notes + l.role + l.email).toLowerCase().indexOf(q) >= 0
    );
  return NextResponse.json({ leads, count: leads.length });
}

export async function POST() {
  const db = getDb();
  const [id] = nextLeadIds(db, 1);
  const lead: Lead = {
    id,
    name: '新线索 ' + id.slice(1),
    country: 'PH',
    city: '',
    source: '手动导入',
    profile_url: '',
    email: '',
    phone: '',
    telegram: '',
    platforms: [],
    us_years: 0,
    english: 'conversational',
    rating: 0,
    hours_per_week: 0,
    timezone_overlap: 0,
    ai_tools: 0,
    skills: [],
    role: '',
    client_type: '',
    notes: '',
    score: 0,
    tier: 'C',
    status: 'new',
    messages: [],
    activities: [],
    created_at: todayStr(),
    last_contact_at: null,
    next_followup_at: null,
    dup_count: 0,
  };
  regrade(lead);
  addActivity(lead, '手动新建线索');
  insertLead(db, lead);
  return NextResponse.json({ lead });
}

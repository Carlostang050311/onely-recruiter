// GET /api/leads?country=&source=&tier=&status=&q= ；POST /api/leads 新建线索
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { insertLead, regrade, addActivity, nextLeadIds } from '../../../lib/store';
import type { Lead, LeadRow } from '../../../lib/types';
import { rowToLead, todayStr } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const db = getDb();
  const where: string[] = [];
  const args: (string | number)[] = [];
  const country = sp.get('country');
  const source = sp.get('source');
  const tier = sp.get('tier');
  const status = sp.get('status');
  const q = (sp.get('q') ?? '').toLowerCase();
  if (country) {
    where.push('country = ?');
    args.push(country);
  }
  if (source) {
    where.push('source = ?');
    args.push(source);
  }
  if (tier) {
    where.push('tier = ?');
    args.push(tier);
  }
  if (status) {
    where.push('status = ?');
    args.push(status);
  }
  if (q) {
    where.push('(name LIKE ? OR city LIKE ? OR notes LIKE ? OR role LIKE ? OR email LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like, like);
  }
  const sql = `SELECT * FROM leads${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id ASC`;
  const rows = db.prepare(sql).all(...args) as unknown as LeadRow[];
  return NextResponse.json({ leads: rows.map(rowToLead), count: rows.length });
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

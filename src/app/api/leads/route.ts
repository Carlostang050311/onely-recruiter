// GET /api/leads?status=&channel=&tier=&q=&sort=
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import type { LeadRow } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const db = getDb();
  const sp = req.nextUrl.searchParams;
  const where: string[] = [];
  const args: (string | number)[] = [];

  const status = sp.get('status');
  if (status) {
    where.push('status = ?');
    args.push(status);
  }
  const channel = sp.get('channel');
  if (channel) {
    where.push('channel = ?');
    args.push(channel);
  }
  const tier = sp.get('tier');
  if (tier) {
    where.push('tier = ?');
    args.push(tier);
  }
  const q = sp.get('q');
  if (q) {
    where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR handle LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like);
  }

  const sortMap: Record<string, string> = {
    score: 'score DESC',
    created: 'created_at DESC',
    followup: 'next_followup_at ASC',
  };
  const sort = sortMap[sp.get('sort') ?? 'score'] ?? 'score DESC';
  const sql = `SELECT * FROM leads${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY ${sort}`;
  const rows = db.prepare(sql).all(...args) as unknown as LeadRow[];
  return NextResponse.json({ leads: rows, count: rows.length });
}

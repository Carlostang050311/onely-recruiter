// POST /api/seed → 清库重灌演示数据
import { NextResponse } from 'next/server';
import { getDb, resetDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  resetDb();
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM leads').get() as { n: number };
  return NextResponse.json({ ok: true, leads: row.n });
}

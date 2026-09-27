// GET /api/stats → 看板数据
import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { computeStats } from '../../../lib/stats';
import type { LeadRow } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = getDb().prepare('SELECT * FROM leads').all() as LeadRow[];
  return NextResponse.json(computeStats(rows));
}

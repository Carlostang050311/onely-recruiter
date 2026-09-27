// GET /api/stats → 仪表盘全部数据
import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { allLeads } from '../../../lib/store';
import { computeStats } from '../../../lib/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(computeStats(allLeads(getDb())));
}

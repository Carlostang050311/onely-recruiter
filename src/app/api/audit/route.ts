// GET /api/audit → 最近审计 + 评分校准统计
import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { recentAudit } from '../../../lib/audit';
import { calibrationStats } from '../../../lib/sample';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ audit: recentAudit(db, 50), calibration: calibrationStats(db) });
}

// POST /api/admin/retention  body: { days? = 90 } —— PII 留存策略执行（lead/finance 角色）
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { anonymizeStale, retentionPreview } from '../../../../lib/retention';
import { audit } from '../../../../lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const db = getDb();
  const actor = req.headers.get('x-auth-user') ?? 'system';
  const body = (await req.json().catch(() => ({}))) as { days?: number };
  const days = Math.max(0, Number(body.days ?? 90));
  const preview = retentionPreview(db, days);
  const n = anonymizeStale(db, days);
  audit(db, actor, 'retention.run', '*', `days=${days} anonymized=${n}`);
  return NextResponse.json({ preview, anonymized: n, days });
}

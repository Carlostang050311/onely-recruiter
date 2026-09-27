// POST /api/leads/import  body: { csv, filename }
// 表头别名映射 → 逐行建模 → 三键去重（合并进最早一条）→ 入库 → 导入报告
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { parseImport } from '../../../../lib/csv';
import { dedupKey, mergeInto } from '../../../../lib/dedup';
import { allLeads, insertLead, saveLead } from '../../../../lib/store';
import { SOURCES, todayStr } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

function nextSeq(db: ReturnType<typeof getDb>): number {
  const rows = db.prepare('SELECT id FROM leads').all() as { id: string }[];
  let max = 0;
  for (const r of rows) {
    const m = r.id.match(/^L(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { csv?: string; filename?: string };
  if (!body.csv || !body.csv.trim()) {
    return NextResponse.json({ error: 'empty csv' }, { status: 400 });
  }
  const db = getDb();
  let seq = nextSeq(db);
  const idGen = () => 'L' + String(++seq).padStart(3, '0');

  const { leads: incoming, invalid, total } = parseImport(body.csv, SOURCES, idGen);

  const existing = allLeads(db);
  const keyIndex = new Map<string, (typeof existing)[number]>();
  for (const l of existing) {
    const k = dedupKey(l);
    if (k && !keyIndex.has(k)) keyIndex.set(k, l);
  }

  let nw = 0;
  let merged = 0;
  for (const l of incoming) {
    const k = dedupKey(l);
    const hit = k ? keyIndex.get(k) : undefined;
    if (k && hit) {
      mergeInto(hit, l);
      saveLead(db, hit);
      merged += 1;
    } else {
      insertLead(db, l);
      if (k) keyIndex.set(k, l);
      nw += 1;
    }
  }

  db.prepare(
    'INSERT INTO imports (filename, total_rows, inserted, duplicates, created_at) VALUES (?,?,?,?,?)'
  ).run(body.filename ?? 'paste.csv', total, nw, merged, todayStr());

  return NextResponse.json({ total, nw, merged, invalid });
}

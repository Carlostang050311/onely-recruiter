// POST /api/leads/import  body: { csv: string, filename?: string }
// 解析 → 批内 + 库内去重 → 自动评分分级 → 入库；返回导入报告。
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { parseCsvTable, toBool, toInt, toEnglishScore } from '../../../../lib/csv';
import { dedupLeads } from '../../../../lib/dedup';
import { scoreLead, safeParsePlatforms } from '../../../../lib/scoring';
import type { Channel, LeadInput, LeadRow } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

const INSERT_SQL = `INSERT INTO leads (
  first_name, last_name, email, handle, location, channel, platforms,
  us_clients_exp, chat_exp, crm_exp, hours_per_week, us_shift, english_sample,
  device_ok, backup_internet, niche, source_url, score, tier, status, created_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

function rowToLead(r: Record<string, string>): LeadInput | null {
  const first = r['first_name'] ?? r['name'] ?? '';
  if (!first.trim()) return null;
  const channelRaw = (r['channel'] ?? '').trim();
  const platformsRaw = r['platforms'] ?? '';
  let platforms: string[] = [];
  try {
    const parsed = JSON.parse(platformsRaw);
    if (Array.isArray(parsed)) platforms = parsed.map(String);
  } catch {
    platforms = safeParsePlatforms(platformsRaw);
  }
  return {
    first_name: first.trim(),
    last_name: (r['last_name'] ?? '').trim(),
    email: (r['email'] ?? '').trim(),
    handle: (r['handle'] ?? '').trim(),
    location: (r['location'] ?? '').trim(),
    channel: (channelRaw || 'facebook_group') as Channel,
    platforms,
    us_clients_exp: toBool(r['us_clients_exp']),
    chat_exp: toBool(r['chat_exp']),
    crm_exp: toBool(r['crm_exp']),
    hours_per_week: toInt(r['hours_per_week']),
    us_shift: toBool(r['us_shift']),
    english_sample: toEnglishScore(r['english_sample']),
    device_ok: toBool(r['device_ok']),
    backup_internet: toBool(r['backup_internet']),
    niche: (r['niche'] ?? '').trim(),
    source_url: (r['source_url'] ?? '').trim(),
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { csv?: string; filename?: string };
  if (!body.csv || !body.csv.trim()) {
    return NextResponse.json({ error: 'empty csv' }, { status: 400 });
  }
  const db = getDb();
  const { rows } = parseCsvTable(body.csv);
  const incoming = rows
    .map((r, idx) => {
      const lead = rowToLead(r);
      return lead ? { ...lead, _row: idx + 1 } : null;
    })
    .filter((x): x is LeadInput & { _row: number } => x !== null);

  const existing = db
    .prepare('SELECT id, email, handle, first_name, last_name, location FROM leads')
    .all() as { id: number; email: string | null; handle: string | null; first_name: string; last_name: string; location: string | null }[];

  const { kept, duplicates } = dedupLeads(incoming, existing);

  const stmt = db.prepare(INSERT_SQL);
  const created = new Date().toISOString();
  const inserted: LeadRow[] = [];
  for (const lead of kept) {
    const platformsJson = JSON.stringify(lead.platforms);
    const scored = scoreLead({ ...lead, platforms: lead.platforms });
    const info = stmt.run(
      lead.first_name, lead.last_name ?? '', lead.email ?? '', lead.handle ?? '', lead.location ?? '',
      lead.channel, platformsJson,
      lead.us_clients_exp ? 1 : 0, lead.chat_exp ? 1 : 0, lead.crm_exp ? 1 : 0,
      lead.hours_per_week ?? 0, lead.us_shift ? 1 : 0, lead.english_sample ?? 0,
      lead.device_ok ? 1 : 0, lead.backup_internet ? 1 : 0, lead.niche ?? '', lead.source_url ?? '',
      scored.score, scored.tier, 'new', created
    );
    inserted.push({
      id: Number(info.lastInsertRowid),
      ...lead,
      platforms: platformsJson,
      score: scored.score,
      tier: scored.tier,
    } as unknown as LeadRow);
  }

  db.prepare(
    'INSERT INTO imports (filename, total_rows, inserted, duplicates, created_at) VALUES (?,?,?,?,?)'
  ).run(body.filename ?? 'paste.csv', rows.length, kept.length, duplicates.length, created);

  return NextResponse.json({
    totalRows: rows.length,
    parsedRows: incoming.length,
    inserted: kept.length,
    duplicates,
    insertedLeads: inserted.map((l) => ({ id: l.id, name: `${l.first_name} ${l.last_name}`.trim(), score: l.score, tier: l.tier })),
  });
}

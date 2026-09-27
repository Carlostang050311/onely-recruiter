// PII 留存策略：lost 且超过 N 天（默认 90）的线索自动匿名化（GDPR / 菲律宾 DPA 口径）。
import type { Database as DatabaseSync } from 'better-sqlite3';
import type { LeadRow } from './types';

export function anonymizeStale(db: DatabaseSync, days: number, now = new Date()): number {
  const cutoff = new Date(now.getTime() - days * 86400_000).toISOString().slice(0, 10);
  const rows = db
    .prepare("SELECT id, name FROM leads WHERE status = 'lost' AND created_at <= ?")
    .all(cutoff) as { id: string; name: string }[];
  const stmt = db.prepare(
    `UPDATE leads SET name = ?, email = '', phone = '', telegram = '', profile_url = '', notes = '', skills = '[]' WHERE id = ?`
  );
  for (const r of rows) {
    stmt.run(`Anonymized-${r.id}`, r.id);
  }
  return rows.length;
}

export function retentionPreview(db: DatabaseSync, days: number, now = new Date()): number {
  const cutoff = new Date(now.getTime() - days * 86400_000).toISOString().slice(0, 10);
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM leads WHERE status = 'lost' AND created_at <= ?")
    .get(cutoff) as { n: number };
  return row.n;
}

export type { LeadRow };

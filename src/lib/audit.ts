// 审计日志：谁在什么时候对哪条线索做了什么。
import type { DatabaseSync } from 'node:sqlite';

export function audit(
  db: DatabaseSync,
  actor: string,
  action: string,
  entity: string,
  detail = ''
): void {
  db.prepare('INSERT INTO audit (ts, actor, action, entity, detail) VALUES (?,?,?,?,?)').run(
    new Date().toISOString(),
    actor,
    action,
    entity,
    detail
  );
}

export interface AuditRow {
  id: number;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
}

export function recentAudit(db: DatabaseSync, limit = 50): AuditRow[] {
  return db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT ?').all(limit) as unknown as AuditRow[];
}

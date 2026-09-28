// 存储与业务动作：读写线索、阶段流转、模拟发送（与参照稿 moveStage / simSend 语义一致）。

import type { Db as DatabaseSync } from './sqljs';
import type { Lead, LeadRow, Status } from './types';
import { STAGE_KEYS, STATUSES, addDays, rowToLead, todayStr } from './types';
import { buildMessage } from './copy';
import { grade } from './scoring';

const COLS = [
  'id', 'name', 'country', 'city', 'source', 'profile_url', 'email', 'phone', 'telegram',
  'platforms', 'us_years', 'english', 'rating', 'hours_per_week', 'timezone_overlap', 'ai_tools',
  'skills', 'role', 'client_type', 'notes', 'score', 'tier', 'status', 'messages', 'activities',
  'created_at', 'last_contact_at', 'next_followup_at', 'dup_count',
] as const;

export function allLeads(db: DatabaseSync): Lead[] {
  const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC, id ASC').all() as unknown as LeadRow[];
  return rows.map(rowToLead);
}

export function getLead(db: DatabaseSync, id: string): Lead | null {
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as unknown as LeadRow | undefined;
  return row ? rowToLead(row) : null;
}

export function insertLead(db: DatabaseSync, l: Lead): void {
  const sql = `INSERT INTO leads (${COLS.join(',')}) VALUES (${COLS.map(() => '?').join(',')})`;
  db.prepare(sql).run(
    l.id, l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram,
    JSON.stringify(l.platforms), l.us_years, l.english, l.rating, l.hours_per_week, l.timezone_overlap, l.ai_tools,
    JSON.stringify(l.skills), l.role, l.client_type, l.notes, l.score, l.tier, l.status,
    JSON.stringify(l.messages), JSON.stringify(l.activities),
    l.created_at, l.last_contact_at, l.next_followup_at, l.dup_count
  );
}

export function saveLead(db: DatabaseSync, l: Lead): void {
  const sets = COLS.filter((c) => c !== 'id').map((c) => `${c} = ?`).join(', ');
  const vals: (string | number | null)[] = [
    l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram,
    JSON.stringify(l.platforms), l.us_years, l.english, l.rating, l.hours_per_week, l.timezone_overlap, l.ai_tools,
    JSON.stringify(l.skills), l.role, l.client_type, l.notes, l.score, l.tier, l.status,
    JSON.stringify(l.messages), JSON.stringify(l.activities),
    l.created_at, l.last_contact_at, l.next_followup_at, l.dup_count,
  ];
  db.prepare(`UPDATE leads SET ${sets} WHERE id = ?`).run(...vals, l.id);
}

export function addActivity(l: Lead, text: string, day = todayStr()): void {
  l.activities = [{ t: day, text }, ...l.activities];
}

/** 阶段流转：dir ±1；lost 视为从 new 起算。返回是否成功。 */
export function moveStage(l: Lead, dir: 1 | -1): boolean {
  const i = STAGE_KEYS.indexOf(l.status === 'lost' ? 'new' : l.status);
  const ni = i + dir;
  if (ni < 0 || ni >= STAGE_KEYS.length) return false;
  l.status = STAGE_KEYS[ni];
  applyStageSideEffects(l);
  return true;
}

export function setStatus(l: Lead, status: Status): void {
  l.status = status;
  applyStageSideEffects(l);
}

function applyStageSideEffects(l: Lead, day = todayStr()): void {
  if (l.status === 'contacted') {
    l.last_contact_at = day;
    l.next_followup_at = addDays(day, 2);
  }
  if (l.status === 'replied') l.next_followup_at = addDays(day, 1);
  if (l.status === 'qualified') l.next_followup_at = addDays(day, 1);
  if (l.status === 'onboarded') {
    l.next_followup_at = null;
    addActivity(l, '加入 Discord 并完成入驻清单，分配首个账号', day);
  } else {
    addActivity(l, STATUSES.find((s) => s.key === l.status)?.label ?? l.status, day);
  }
}

/** 模拟发送：记录文案、推进 new→contacted、排定 D+2 / D+4 跟进 */
export function simSend(l: Lead, channelKey: string, seq = 0) {
  const msg = buildMessage(l, channelKey, seq);
  l.messages = [...l.messages, { channel: channelKey, seq, subject: msg.subject, body: msg.body, t: todayStr() }];
  if (l.status === 'new') l.status = 'contacted';
  l.last_contact_at = todayStr();
  l.next_followup_at = seq >= 2 ? null : addDays(todayStr(), 2);
  const channelLabel = { email: '邮件', facebook: 'Facebook DM', linkedin: 'LinkedIn', telegram: 'Telegram', whatsapp: 'WhatsApp', x: 'X DM' }[channelKey] ?? channelKey;
  addActivity(l, channelLabel + (seq ? ' 第' + (seq + 1) + '次跟进' : '首触') + '已发送（模拟）');
  return msg;
}

export function regrade(l: Lead) {
  grade(l);
}

/** 生成接续的 L### 编号 */
export function nextLeadIds(db: DatabaseSync, n: number): string[] {
  const rows = db.prepare('SELECT id FROM leads').all() as { id: string }[];
  let max = 0;
  for (const r of rows) {
    const m = r.id.match(/^L(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return Array.from({ length: n }, (_, i) => 'L' + String(max + i + 1).padStart(3, '0'));
}

// 线索去重：归一化 email / handle / 姓名+地区 三级匹配。
// 规则（满足其一即判重）：
//   1. email 完全一致（两侧都非空，小写去空白）
//   2. handle 一致（去 @、去平台 URL 前缀、小写）
//   3. 姓名键一致 且 地区一致（兜底：同一人换了邮箱和号）

import type { LeadInput } from './types';

export function normalizeEmail(v?: string | null): string {
  return (v ?? '').trim().toLowerCase();
}

export function normalizeHandle(v?: string | null): string {
  let s = (v ?? '').trim().toLowerCase();
  if (!s) return '';
  // 去掉 URL 前缀：https://x.com/abc → abc
  const slash = s.lastIndexOf('/');
  if (s.includes('://') || (slash !== -1 && s.includes('.'))) s = s.slice(slash + 1);
  return s.replace(/^@+/, '').trim();
}

export function nameKey(first?: string | null, last?: string | null): string {
  return `${first ?? ''}${last ?? ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface DedupReportItem {
  row: number; // 文件内第几条数据（1 起）
  name: string;
  matchedKey: 'email' | 'handle' | 'name_location';
  matchedValue: string;
  against: string; // 'file:<row>' 或 'db:<id>'
}

export interface DedupResult {
  kept: LeadInput[];
  duplicates: DedupReportItem[];
}

interface Dedupable {
  email?: string | null;
  handle?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  location?: string | null;
}

interface DbLike {
  id: number;
  email: string | null;
  handle: string | null;
  first_name: string;
  last_name: string;
  location: string | null;
}

function keysOf(x: Dedupable) {
  return {
    email: normalizeEmail(x.email),
    handle: normalizeHandle(x.handle),
    nameLoc: nameKey(x.first_name, x.last_name)
      ? `${nameKey(x.first_name, x.last_name)}|${(x.location ?? '').trim().toLowerCase()}`
      : '',
  };
}

/**
 * 对一批导入线索去重：
 * 1) 批内去重（同批撞车保留先出现的）
 * 2) 与库内已有线索去重（existing 传入当前库全量的 id/email/handle/name/location）
 */
export function dedupLeads(
  incoming: (LeadInput & { _row?: number })[],
  existing: DbLike[]
): DedupResult {
  const kept: LeadInput[] = [];
  const duplicates: DedupReportItem[] = [];
  const seen: { keys: ReturnType<typeof keysOf>; label: string }[] = [];

  for (const e of existing) {
    seen.push({ keys: keysOf(e), label: `db:${e.id}` });
  }

  for (const lead of incoming) {
    const k = keysOf(lead);
    let dup: { matchedKey: 'email' | 'handle' | 'name_location'; matchedValue: string; against: string } | null =
      null;

    if (k.email && seen.some((s) => s.keys.email && s.keys.email === k.email)) {
      dup = { matchedKey: 'email', matchedValue: k.email, against: seen.find((s) => s.keys.email === k.email)!.label };
    } else if (k.handle && seen.some((s) => s.keys.handle && s.keys.handle === k.handle)) {
      dup = {
        matchedKey: 'handle',
        matchedValue: k.handle,
        against: seen.find((s) => s.keys.handle === k.handle)!.label,
      };
    } else if (k.nameLoc && seen.some((s) => s.keys.nameLoc && s.keys.nameLoc === k.nameLoc)) {
      dup = {
        matchedKey: 'name_location',
        matchedValue: k.nameLoc,
        against: seen.find((s) => s.keys.nameLoc === k.nameLoc)!.label,
      };
    }

    if (dup) {
      duplicates.push({
        row: lead._row ?? 0,
        name: `${lead.first_name} ${lead.last_name ?? ''}`.trim(),
        matchedKey: dup.matchedKey,
        matchedValue: dup.matchedValue,
        against: dup.against,
      });
    } else {
      const { _row, ...clean } = lead;
      kept.push(clean as LeadInput);
      seen.push({ keys: k, label: `file:${_row ?? kept.length}` });
    }
  }

  return { kept, duplicates };
}

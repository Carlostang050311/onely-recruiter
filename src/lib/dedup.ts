// 去重 v2 —— 三键归一化：email（忽略大小写）→ profile_url（归一化域名/尾斜杠/查询串）→ phone（仅数字取后 10 位）。
// 语义为「合并」：重复记录并入最早一条，dup_count++，来源与备注拼接，并写一条合并动态。

import type { Activity, Lead } from './types';
import { todayStr } from './types';

export function normEmail(e?: string | null): string {
  return (e ?? '').trim().toLowerCase();
}

export function normUrl(u?: string | null): string {
  return (u ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .split('?')[0];
}

export function normPhone(p?: string | null): string {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length > 10 ? d.slice(-10) : d;
}

export function dedupKey(l: { email?: string | null; profile_url?: string | null; phone?: string | null }): string | null {
  if (l.email && normEmail(l.email)) return 'e:' + normEmail(l.email);
  if (l.profile_url && normUrl(l.profile_url)) return 'u:' + normUrl(l.profile_url);
  if (l.phone && normPhone(l.phone)) return 'p:' + normPhone(l.phone);
  return null;
}

export interface MergeResult {
  merged: boolean;
  key: string | null;
}

/** 把 incoming 合并进 existing（existing 为库内最早一条）。返回是否合并及命中键。 */
export function mergeInto(existing: Lead, incoming: Lead, day = todayStr()): MergeResult {
  const key = dedupKey(incoming);
  if (!key) return { merged: false, key: null };
  existing.dup_count = (existing.dup_count || 0) + 1;
  if (incoming.source && existing.source.indexOf(incoming.source) < 0) {
    existing.source = existing.source + ' + ' + incoming.source;
  }
  if (incoming.notes) existing.notes = (existing.notes ? existing.notes + '；' : '') + incoming.notes;
  const act: Activity = { t: day, text: '导入时合并 1 条重复记录（' + (incoming.source || '重复键') + '）' };
  existing.activities = [act, ...existing.activities];
  return { merged: true, key };
}

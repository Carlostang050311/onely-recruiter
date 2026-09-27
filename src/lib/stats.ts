// 统计 v2 —— 漏斗 / 来源 / 地区 / 分级 / 每日节奏 / 自动化降本测算（口径与参照稿一致）。

import type { Lead } from './types';
import { COUNTRIES, SOURCES, countryByCode, todayStr, addDays } from './types';

export const TARGET = 100;
export const DAILY_PLAN = [30, 35, 35];

export interface FunnelCounts {
  leads: number;
  contacted: number;
  replied: number;
  qualified: number;
  onboarded: number;
  hot: number;
}

export function funnelCounts(L: Lead[]): FunnelCounts {
  const is = (l: Lead, ks: string[]) => ks.indexOf(l.status) >= 0;
  return {
    leads: L.length,
    contacted: L.filter((l) => is(l, ['contacted', 'replied', 'qualified', 'onboarded'])).length,
    replied: L.filter((l) => is(l, ['replied', 'qualified', 'onboarded'])).length,
    qualified: L.filter((l) => is(l, ['qualified', 'onboarded'])).length,
    onboarded: L.filter((l) => l.status === 'onboarded').length,
    hot: L.filter((l) => l.tier === 'S' || l.tier === 'A').length,
  };
}

const ONBOARD_TEXT = '加入 Discord 并完成入驻清单，分配首个账号';

/** 每日入驻实际：按入驻动态日期落入最近三个战役日（D-2 / D-1 / 今天） */
export function dailyActual(L: Lead[], today = todayStr()): number[] {
  const buckets = [addDays(today, -2), addDays(today, -1), today];
  const out = [0, 0, 0];
  for (const l of L) {
    if (l.status !== 'onboarded') continue;
    const act = l.activities.find((a) => a.text === ONBOARD_TEXT);
    const d = act ? act.t : l.created_at;
    const idx = buckets.indexOf(d);
    if (idx >= 0) out[idx] += 1;
  }
  return out;
}

export function sourceCounts(L: Lead[]): [string, number][] {
  const m: Record<string, number> = {};
  SOURCES.forEach((s) => (m[s] = 0));
  L.forEach((l) => {
    const k = SOURCES.includes(l.source) ? l.source : SOURCES[0];
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m)
    .filter((e) => e[1] > 0)
    .sort((a, b) => a[1] - b[1]);
}

export function geoCounts(L: Lead[]): [string, number][] {
  const m: Record<string, number> = {};
  COUNTRIES.forEach((c) => (m[c.code] = 0));
  L.forEach((l) => (m[l.country] = (m[l.country] || 0) + 1));
  return Object.entries(m)
    .filter((e) => e[1] > 0)
    .sort((a, b) => b[1] - a[1]);
}

export function tierCounts(L: Lead[]): Record<'S' | 'A' | 'B' | 'C', number> {
  const t = { S: 0, A: 0, B: 0, C: 0 };
  L.forEach((l) => (t[l.tier] = (t[l.tier] || 0) + 1));
  return t;
}

/** 自动化降本测算：以 1,000 条有效线索的一期战役为口径（分钟 → 小时） */
export const SAVINGS = (() => {
  const cats = ['采集录入', '去重', '分级评分', '文案撰写', '跟进排期', '数据统计', '回复与面试'];
  const manH = [2000, 800, 3000, 4750, 1425, 300, 600].map((m) => +(m / 60).toFixed(1));
  const autH = [50, 10, 20, 48, 19, 5, 600].map((m) => +(m / 60).toFixed(1));
  const manualTotal = +manH.reduce((a, b) => a + b, 0).toFixed(1);
  const autoTotal = +autH.reduce((a, b) => a + b, 0).toFixed(1);
  return {
    cats,
    manH,
    autH,
    manualTotal,
    autoTotal,
    saved: +(manualTotal - autoTotal).toFixed(1),
    savedPct: Math.round((1 - autoTotal / manualTotal) * 100),
    fteManual: Math.ceil(manualTotal / 24),
    fteAuto: autoTotal / 24 < 1 ? '0.5' : '1',
  };
})();

export interface Stats {
  kpi: FunnelCounts & {
    contactRate: number;
    replyRate: number;
    qualRate: number;
    onbRate: number;
    hotRate: number;
  };
  funnel: FunnelCounts;
  daily: { plan: number[]; actual: number[] };
  sources: [string, number][];
  geo: { code: string; flag: string; count: number }[];
  tiers: Record<'S' | 'A' | 'B' | 'C', number>;
  savings: typeof SAVINGS;
  reminders: number;
}

export function computeStats(L: Lead[], today = todayStr()): Stats {
  const c = funnelCounts(L);
  const geo = geoCounts(L).map(([code, count]) => ({ code, flag: countryByCode(code).flag, count }));
  const reminders = L.filter(
    (l) => l.next_followup_at && l.next_followup_at <= today && ['contacted', 'replied', 'qualified'].includes(l.status)
  ).length;
  return {
    kpi: {
      ...c,
      contactRate: c.leads ? Math.round((c.contacted / c.leads) * 100) : 0,
      replyRate: c.contacted ? Math.round((c.replied / c.contacted) * 100) : 0,
      qualRate: c.replied ? Math.round((c.qualified / c.replied) * 100) : 0,
      onbRate: c.qualified ? Math.round((c.onboarded / c.qualified) * 100) : 0,
      hotRate: c.leads ? Math.round((c.hot / c.leads) * 100) : 0,
    },
    funnel: c,
    daily: { plan: DAILY_PLAN, actual: dailyActual(L, today) },
    sources: sourceCounts(L),
    geo,
    tiers: tierCounts(L),
    savings: SAVINGS,
    reminders,
  };
}

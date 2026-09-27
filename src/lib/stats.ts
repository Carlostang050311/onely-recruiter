// 漏斗与进度统计：全部基于时间戳的"到达过该阶段"口径（比当前状态更准确）。

import type { LeadRow, Status } from './types';
import { STATUS_FLOW, STATUS_LABELS, channelLabel } from './types';
import { safeParsePlatforms } from './scoring';

export const TARGET = 100;
/** 三天累计目标：D1 33 / D2 67 / D3 100 */
export const TARGET_CUM = [34, 67, 100];

export interface FunnelStage {
  status: Status;
  label: string;
  reached: number;
  convFromPrev: number | null; // 0-1
}

export interface ChannelRow {
  channel: string;
  label: string;
  leads: number;
  contacted: number;
  replied: number;
  applied: number;
  onboarded: number;
  replyRate: number | null;
}

export interface PaceDay {
  day: string; // D1 / D2 / D3
  date: string; // M/D
  onboarded: number;
  targetCum: number;
}

export interface Stats {
  totals: {
    leads: number;
    onboarded: number;
    target: number;
    targetPct: number;
    followupsDue: number;
    aTier: number;
    currentDay: number; // 冲刺第几天（1-3）
    targetNow: number; // 当前应达累计目标线
  };
  funnel: FunnelStage[];
  byChannel: ChannelRow[];
  pace: PaceDay[];
  rates: { replyRate: number | null; applyRate: number | null; sampleRate: number | null; acceptRate: number | null };
}

function reached(rows: LeadRow[], field: keyof LeadRow): number {
  return rows.filter((r) => r[field]).length;
}

function pct(a: number, b: number): number | null {
  if (!b) return null;
  return a / b;
}

export function computeStats(rows: LeadRow[], now = Date.now()): Stats {
  const funnel: FunnelStage[] = STATUS_FLOW.map((s, idx) => {
    const field = s === 'new' ? 'created_at' : `${s}_at`;
    const n = s === 'new' ? rows.length : reached(rows, field as keyof LeadRow);
    const prev = idx === 0 ? null : funnelPrev(rows, STATUS_FLOW[idx - 1]);
    return {
      status: s,
      label: STATUS_LABELS[s],
      reached: n,
      convFromPrev: idx === 0 || prev === null ? null : pct(n, prev),
    };
  });

  const channels = [...new Set(rows.map((r) => r.channel))];
  const byChannel: ChannelRow[] = channels
    .map((ch) => {
      const sub = rows.filter((r) => r.channel === ch);
      const contacted = reached(sub, 'contacted_at');
      const replied = reached(sub, 'replied_at');
      return {
        channel: ch,
        label: channelLabel(ch),
        leads: sub.length,
        contacted,
        replied,
        applied: reached(sub, 'applied_at'),
        onboarded: reached(sub, 'onboarded_at'),
        replyRate: pct(replied, contacted),
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // 冲刺起点 = 最早 created_at；按自然日切 D1/D2/D3
  const startTs = rows.length ? Math.min(...rows.map((r) => new Date(r.created_at).getTime())) : now;
  const dayMs = 24 * 3600_000;
  const pace: PaceDay[] = [1, 2, 3].map((d) => {
    const from = startTs + (d - 1) * dayMs;
    const to = startTs + d * dayMs;
    const n = rows.filter((r) => {
      if (!r.onboarded_at) return false;
      const t = new Date(r.onboarded_at).getTime();
      return t >= from && t < to;
    }).length;
    const date = new Date(from).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    return { day: `D${d}`, date, onboarded: n, targetCum: TARGET_CUM[d - 1] };
  });

  const contacted = reached(rows, 'contacted_at');
  const replied = reached(rows, 'replied_at');
  const applied = reached(rows, 'applied_at');
  const sampleDone = reached(rows, 'sample_done_at');
  const offered = reached(rows, 'offered_at');
  const onboarded = reached(rows, 'onboarded_at');

  const followupsDue = rows.filter(
    (r) => r.next_followup_at && new Date(r.next_followup_at).getTime() <= now && !['replied', 'onboarded', 'rejected'].includes(r.status)
  ).length;

  return {
    totals: {
      leads: rows.length,
      onboarded,
      target: TARGET,
      targetPct: pct(onboarded, TARGET) ?? 0,
      followupsDue,
      aTier: rows.filter((r) => r.tier === 'A').length,
      currentDay: Math.min(3, Math.max(1, Math.floor((now - startTs) / dayMs) + 1)),
      targetNow: TARGET_CUM[Math.min(2, Math.max(0, Math.floor((now - startTs) / dayMs)))],
    },
    funnel,
    byChannel,
    pace,
    rates: {
      replyRate: pct(replied, contacted),
      applyRate: pct(applied, replied),
      sampleRate: pct(sampleDone, applied),
      acceptRate: pct(onboarded, offered),
    },
  };
}

function funnelPrev(rows: LeadRow[], s: Status): number {
  if (s === 'new') return rows.length;
  const field = `${s}_at`;
  return reached(rows, field as keyof LeadRow);
}

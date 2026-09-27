// 评分与分级。满分 100，权重见 AGENTS.md。
// A ≥75 当天直发 offer；B 55–74 备选池滚动补位；C <55 淘汰或转内容岗。

import type { LeadInput, LeadRow, Tier } from './types';

export const CHANNEL_WEIGHT: Record<string, number> = {
  telegram_community: 12,
  referral: 11,
  discord_community: 11,
  onlinejobs: 10,
  linkedin: 10,
  facebook_group: 8,
  twitter: 8,
  upwork: 6,
};

const PLATFORM_BONUS = 5; // 每个平台 +5，封顶 15
export const TIER_A = 75;
export const TIER_B = 55;

export interface ScoreResult {
  score: number;
  tier: Tier;
  reasons: string[]; // 加分点说明，供 UI 展示
}

function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['1', 'true', 'yes', 'y', '√', '是'].includes(v.trim().toLowerCase());
  return false;
}

export function scoreLead(lead: Pick<
  LeadInput & LeadRow,
  | 'channel'
  | 'platforms'
  | 'us_clients_exp'
  | 'chat_exp'
  | 'crm_exp'
  | 'hours_per_week'
  | 'us_shift'
  | 'english_sample'
>): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const cw = CHANNEL_WEIGHT[lead.channel] ?? 5;
  score += cw;

  const platforms: string[] = Array.isArray(lead.platforms)
    ? (lead.platforms as unknown as string[])
    : safeParsePlatforms(lead.platforms);
  const platCount = Math.min(platforms.length, 3);
  if (platCount > 0) score += platCount * PLATFORM_BONUS;

  if (bool(lead.us_clients_exp)) {
    score += 18;
    reasons.push('有美区/欧区客户运营经验 +18');
  }
  if (bool(lead.us_shift)) {
    score += 15;
    reasons.push('能上美区班次 +15');
  }
  const h = Number(lead.hours_per_week) || 0;
  if (h >= 30) {
    score += 10;
    reasons.push(`每周可投入 ${h} 小时 +10`);
  } else if (h >= 20) {
    score += 7;
    reasons.push(`每周可投入 ${h} 小时 +7`);
  } else if (h >= 10) {
    score += 3;
  }
  const eng = Math.max(0, Math.min(25, Number(lead.english_sample) || 0));
  if (eng > 0) {
    score += eng;
    if (eng >= 18) reasons.push(`英文样题 ${eng}/25 +${eng}`);
  }
  if (bool(lead.chat_exp)) {
    score += 7;
    reasons.push('有粉丝聊天/互动经验 +7');
  }
  if (bool(lead.crm_exp)) {
    score += 3;
    reasons.push('用过 CRM/消息后台 +3');
  }
  if (platforms.length > 0) {
    reasons.push(`平台覆盖：${platforms.join(', ')} +${platCount * PLATFORM_BONUS}`);
  }
  reasons.push(`渠道权重（${lead.channel}）+${cw}`);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier: Tier = score >= TIER_A ? 'A' : score >= TIER_B ? 'B' : 'C';
  return { score, tier, reasons };
}

export function safeParsePlatforms(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v.trim() !== '') {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // 允许分号/逗号分隔的裸字符串
      return v
        .split(/[,;，；]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

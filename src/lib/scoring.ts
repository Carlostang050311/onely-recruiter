// 评分模型 v2 —— 与参照稿一致的 7 维 100 分制。
// 分级：S ≥85（首批直聊）· A 70–84 · B 55–69（waitlist/补训）· C <55（婉拒）

import type { Lead, Tier } from './types';
import { PLATFORM_LABEL } from './types';

export interface ScorePart {
  k: string; // 维度名
  w: number; // 满分
  v: number; // 得分
  d: string; // 依据描述
}

export const TIER_S = 85;
export const TIER_A = 70;
export const TIER_B = 55;

type Scorable = Pick<
  Lead,
  'platforms' | 'us_years' | 'english' | 'rating' | 'timezone_overlap' | 'hours_per_week' | 'ai_tools'
>;

export function scoreParts(l: Scorable): ScorePart[] {
  const p = l.platforms || [];
  const parts: ScorePart[] = [];

  const y = +l.us_years || 0;
  parts.push({
    k: '美国/欧洲创作者运营经验',
    w: 24,
    v: y >= 3 ? 24 : y === 2 ? 19 : y === 1 ? 13 : y > 0 ? 6 : 0,
    d: y + ' 年',
  });

  const hasT = p.includes('tiktok');
  const hasI = p.includes('instagram');
  parts.push({
    k: 'TikTok / Instagram 平台匹配',
    w: 16,
    v: hasT && hasI ? 16 : hasT || hasI ? 10 : 4,
    d: p.map((x) => PLATFORM_LABEL[x] || x).join('、') || '无',
  });

  const e = l.english === 'native' ? 15 : l.english === 'fluent' ? 11 : 6;
  parts.push({
    k: '英语写作能力',
    w: 15,
    v: e,
    d: l.english === 'native' ? '母语级' : l.english === 'fluent' ? '流利' : '日常交流',
  });

  const r = +l.rating || 0;
  parts.push({
    k: '平台评分 / 好评率',
    w: 15,
    v: r >= 90 ? 15 : r >= 80 ? 12 : r >= 70 ? 8 : r > 0 ? 4 : 6,
    d: r ? r + ' 分' : '无记录',
  });

  const tz = +l.timezone_overlap || 0;
  parts.push({ k: '美国时区重叠时长', w: 10, v: tz >= 4 ? 10 : tz >= 2 ? 7 : 3, d: tz + ' 小时' });

  const h = +l.hours_per_week || 0;
  parts.push({ k: '每周可投入小时', w: 10, v: h >= 30 ? 10 : h >= 15 ? 8 : h >= 5 ? 5 : 2, d: h + ' 小时' });

  parts.push({
    k: 'AI 工具熟练度',
    w: 10,
    v: l.ai_tools ? 10 : 4,
    d: l.ai_tools ? '熟练使用 ChatGPT/CapCut 等' : '未声明',
  });

  return parts;
}

export function tierOf(score: number): Tier {
  return score >= TIER_S ? 'S' : score >= TIER_A ? 'A' : score >= TIER_B ? 'B' : 'C';
}

/** 就地打分并返回明细 */
export function grade(l: Scorable & { score: number; tier: Tier }): ScorePart[] {
  const parts = scoreParts(l);
  l.score = parts.reduce((s, x) => s + x.v, 0);
  l.tier = tierOf(l.score);
  return parts;
}

import { describe, it, expect } from 'vitest';
import { scoreParts, grade, tierOf, TIER_S, TIER_A, TIER_B } from '../src/lib/scoring';

const base = {
  platforms: [] as string[],
  us_years: 0,
  english: 'conversational' as const,
  rating: 0,
  timezone_overlap: 0,
  hours_per_week: 0,
  ai_tools: 0,
};

describe('scoreParts 七维满分 100', () => {
  it('维度与权重固定', () => {
    const parts = scoreParts(base);
    expect(parts.map((p) => p.w)).toEqual([24, 16, 15, 15, 10, 10, 10]);
    expect(parts.reduce((s, p) => s + p.w, 0)).toBe(100);
  });

  it('经验年限阶梯 3+/2/1', () => {
    expect(scoreParts({ ...base, us_years: 3 })[0].v).toBe(24);
    expect(scoreParts({ ...base, us_years: 2 })[0].v).toBe(19);
    expect(scoreParts({ ...base, us_years: 1 })[0].v).toBe(13);
    expect(scoreParts({ ...base, us_years: 0 })[0].v).toBe(0);
  });

  it('TikTok+Instagram 双平台满分', () => {
    expect(scoreParts({ ...base, platforms: ['tiktok', 'instagram'] })[1].v).toBe(16);
    expect(scoreParts({ ...base, platforms: ['tiktok'] })[1].v).toBe(10);
    expect(scoreParts({ ...base, platforms: ['youtube'] })[1].v).toBe(4);
  });

  it('英语三档', () => {
    expect(scoreParts({ ...base, english: 'native' })[2].v).toBe(15);
    expect(scoreParts({ ...base, english: 'fluent' })[2].v).toBe(11);
    expect(scoreParts({ ...base, english: 'conversational' })[2].v).toBe(6);
  });

  it('评分无记录时给基础分 6', () => {
    expect(scoreParts({ ...base, rating: 0 })[3].v).toBe(6);
    expect(scoreParts({ ...base, rating: 95 })[3].v).toBe(15);
  });
});

describe('grade 与分级', () => {
  it('满分候选人 S 级', () => {
    const l = {
      ...base,
      platforms: ['tiktok', 'instagram'],
      us_years: 4,
      english: 'native' as const,
      rating: 96,
      timezone_overlap: 5,
      hours_per_week: 40,
      ai_tools: 1,
      score: 0,
      tier: 'C' as const,
    };
    grade(l);
    expect(l.score).toBe(100);
    expect(l.tier).toBe('S');
  });

  it('分级阈值 S85 / A70 / B55', () => {
    expect(tierOf(TIER_S)).toBe('S');
    expect(tierOf(TIER_S - 1)).toBe('A');
    expect(tierOf(TIER_A)).toBe('A');
    expect(tierOf(TIER_A - 1)).toBe('B');
    expect(tierOf(TIER_B)).toBe('B');
    expect(tierOf(TIER_B - 1)).toBe('C');
  });

  it('弱线索 C 级', () => {
    const l = { ...base, score: 0, tier: 'C' as const };
    grade(l);
    expect(l.tier).toBe('C');
  });
});

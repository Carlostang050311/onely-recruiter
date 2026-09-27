import { describe, it, expect } from 'vitest';
import { scoreLead, safeParsePlatforms, TIER_A, TIER_B } from '../src/lib/scoring';

const base = {
  channel: 'facebook_group',
  platforms: '["instagram"]',
  us_clients_exp: 0,
  chat_exp: 0,
  crm_exp: 0,
  hours_per_week: 0,
  us_shift: 0,
  english_sample: 0,
};

describe('scoreLead', () => {
  it('强线索评 A 级（≥75）', () => {
    const r = scoreLead({
      ...base,
      channel: 'telegram_community',
      platforms: JSON.stringify(['instagram', 'tiktok', 'x']),
      us_clients_exp: 1,
      chat_exp: 1,
      crm_exp: 1,
      hours_per_week: 35,
      us_shift: 1,
      english_sample: 22,
    });
    expect(r.score).toBeGreaterThanOrEqual(TIER_A);
    expect(r.tier).toBe('A');
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it('弱线索评 C 级', () => {
    const r = scoreLead(base);
    expect(r.tier).toBe('C');
    expect(r.score).toBeLessThan(TIER_B);
  });

  it('中等线索评 B 级', () => {
    const r = scoreLead({
      ...base,
      platforms: JSON.stringify(['instagram', 'tiktok']),
      us_clients_exp: 1,
      us_shift: 1,
      hours_per_week: 25,
      english_sample: 16,
    });
    expect(r.tier).toBe('B');
  });

  it('分数封顶 100、不为负', () => {
    const r = scoreLead({
      ...base,
      channel: 'telegram_community',
      platforms: JSON.stringify(['instagram', 'tiktok', 'x', 'reddit', 'youtube']),
      us_clients_exp: 1,
      chat_exp: 1,
      crm_exp: 1,
      hours_per_week: 40,
      us_shift: 1,
      english_sample: 25,
    });
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('周时长阶梯：30+/20+/10+', () => {
    const s30 = scoreLead({ ...base, hours_per_week: 30 }).score;
    const s20 = scoreLead({ ...base, hours_per_week: 20 }).score;
    const s10 = scoreLead({ ...base, hours_per_week: 10 }).score;
    expect(s30).toBeGreaterThan(s20);
    expect(s20).toBeGreaterThan(s10);
  });
});

describe('safeParsePlatforms', () => {
  it('解析 JSON 数组字符串', () => {
    expect(safeParsePlatforms('["instagram","tiktok"]')).toEqual(['instagram', 'tiktok']);
  });
  it('解析分号/逗号分隔裸串', () => {
    expect(safeParsePlatforms('instagram;tiktok')).toEqual(['instagram', 'tiktok']);
    expect(safeParsePlatforms('instagram, x')).toEqual(['instagram', 'x']);
  });
  it('原样返回数组输入', () => {
    expect(safeParsePlatforms(['a', 'b'])).toEqual(['a', 'b']);
  });
  it('脏输入回落空数组', () => {
    expect(safeParsePlatforms('')).toEqual([]);
    expect(safeParsePlatforms(null)).toEqual([]);
    expect(safeParsePlatforms('{bad json')).toEqual(['{bad json']);
  });
});

import { describe, it, expect } from 'vitest';
import { buildMessage, personalHooks, TEMPLATES, BUMPS, TELEGRAM_HANDLE } from '../src/lib/copy';
import type { Lead } from '../src/lib/types';

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: 'L001',
    name: 'Angela Cruz',
    country: 'PH',
    city: 'Manila',
    source: 'OnlineJobs.ph',
    profile_url: '',
    email: 'a@b.com',
    phone: '',
    telegram: '@angela_cruz',
    platforms: ['tiktok', 'instagram'],
    us_years: 3,
    english: 'fluent',
    rating: 96,
    hours_per_week: 40,
    timezone_overlap: 5,
    ai_tools: 1,
    skills: ['DM 转化'],
    role: '美国创作者社媒代管',
    client_type: 'us_creator',
    notes: '',
    score: 90,
    tier: 'S',
    status: 'new',
    messages: [],
    activities: [],
    created_at: '2026-09-27',
    last_contact_at: null,
    next_followup_at: null,
    dup_count: 0,
    ...over,
  };
}

describe('personalHooks 个性化钩子', () => {
  it('高评分/平台/经验都会产生钩子', () => {
    const h = personalHooks(lead());
    expect(h.some((x) => x.includes('96 client rating'))).toBe(true);
    expect(h.some((x) => x.includes('TikTok growth'))).toBe(true);
    expect(h.some((x) => x.includes('3 years'))).toBe(true);
  });
  it('无线索信号时回落通用钩子', () => {
    const h = personalHooks(lead({ rating: 0, platforms: [], us_years: 0, ai_tools: 0, skills: [], source: 'Reddit', role: '', notes: '' }));
    expect(h[0]).toContain('US and European creators');
  });
});

describe('buildMessage', () => {
  it('邮件模板含主题行与变量代入', () => {
    const m = buildMessage(lead(), 'email');
    expect(m.subject).toContain('Angela');
    expect(m.body).toContain('Hi Angela,');
    expect(m.body).toContain(TELEGRAM_HANDLE);
    expect(m.body).not.toContain('{{');
  });

  it('DM 渠道无主题行', () => {
    expect(buildMessage(lead(), 'telegram').subject).toBe('');
    expect(buildMessage(lead(), 'whatsapp').body).toContain('Reply YES');
  });

  it('D+2 / D+4 使用 bump 文案且互不相同', () => {
    const b1 = buildMessage(lead(), 'email', 1).body;
    const b2 = buildMessage(lead(), 'email', 2).body;
    expect(b1).toBe(BUMPS[0].replace('{{first_name}}', 'Angela').replace('{{country_name}}', '菲律宾'));
    expect(b2).toContain('$25 referral bonus');
    expect(b1).not.toBe(b2);
  });

  it('未知渠道回落邮件模板', () => {
    expect(buildMessage(lead(), 'carrier-pigeon').body).toBe(buildMessage(lead(), 'email').body);
  });

  it('六个渠道模板齐备', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(['email', 'facebook', 'linkedin', 'telegram', 'whatsapp', 'x']);
  });
});

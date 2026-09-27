import { describe, it, expect } from 'vitest';
import { normEmail, normUrl, normPhone, dedupKey, mergeInto } from '../src/lib/dedup';
import type { Lead } from '../src/lib/types';

function lead(over: Partial<Lead> = {}): Lead {
  return {
    id: 'L001',
    name: 'Angela Cruz',
    country: 'PH',
    city: 'Manila',
    source: 'OnlineJobs.ph',
    profile_url: 'https://www.onlinejobs.ph/jobseekers/88421',
    email: 'angela.cruz@gmail.com',
    phone: '+63912345678',
    telegram: '@angela_cruz',
    platforms: ['tiktok'],
    us_years: 2,
    english: 'fluent',
    rating: 90,
    hours_per_week: 30,
    timezone_overlap: 4,
    ai_tools: 1,
    skills: [],
    role: '',
    client_type: '',
    notes: '原备注',
    score: 70,
    tier: 'A',
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

describe('归一化', () => {
  it('email 忽略大小写与空白', () => {
    expect(normEmail('  Angela.Cruz@Gmail.COM ')).toBe('angela.cruz@gmail.com');
  });
  it('url 去协议/www/尾斜杠/查询串', () => {
    expect(normUrl('https://www.onlinejobs.ph/jobseekers/88421/')).toBe('onlinejobs.ph/jobseekers/88421');
    expect(normUrl('http://onlinejobs.ph/jobseekers/88421?x=1')).toBe('onlinejobs.ph/jobseekers/88421');
  });
  it('phone 仅数字取后 10 位', () => {
    expect(normPhone('+63 912-345-678')).toBe('63912345678'.slice(-10));
    expect(normPhone('+2347012345678')).toBe('7012345678'.slice(-10).padStart(10, '7').slice(-10));
  });
});

describe('dedupKey 优先级', () => {
  it('email 优先', () => {
    expect(dedupKey({ email: 'A@B.com', profile_url: 'x.com/1', phone: '123' })).toBe('e:a@b.com');
  });
  it('无 email 用 url', () => {
    expect(dedupKey({ email: '', profile_url: 'https://X.com/1/', phone: '123' })).toBe('u:x.com/1');
  });
  it('仅 phone 兜底', () => {
    expect(dedupKey({ email: '', profile_url: '', phone: '+234-70-12345678' })).toMatch(/^p:/);
  });
  it('三键全空返回 null', () => {
    expect(dedupKey({})).toBeNull();
  });
});

describe('mergeInto 合并语义', () => {
  it('dup_count 递增、来源与备注拼接、写合并动态', () => {
    const ex = lead();
    const inc = lead({ id: 'L002', source: 'Upwork', notes: '新备注', email: 'ANGELA.CRUZ@gmail.com' });
    const r = mergeInto(ex, inc);
    expect(r.merged).toBe(true);
    expect(ex.dup_count).toBe(1);
    expect(ex.source).toBe('OnlineJobs.ph + Upwork');
    expect(ex.notes).toContain('原备注');
    expect(ex.notes).toContain('新备注');
    expect(ex.activities[0].text).toContain('合并 1 条重复记录');
  });

  it('相同来源不重复拼接', () => {
    const ex = lead();
    mergeInto(ex, lead({ id: 'L003' }));
    expect(ex.source).toBe('OnlineJobs.ph');
  });

  it('无去重键不合并', () => {
    const ex = lead();
    const r = mergeInto(ex, lead({ id: 'L004', email: '', profile_url: '', phone: '' }));
    expect(r.merged).toBe(false);
    expect(ex.dup_count).toBe(0);
  });
});

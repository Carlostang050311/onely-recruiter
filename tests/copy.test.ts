import { describe, it, expect } from 'vitest';
import { generateMessage } from '../src/lib/copy';

const lead = {
  first_name: 'Kyla',
  last_name: 'Santos',
  location: 'Quezon City, PH',
  platforms: '["instagram","tiktok","x"]',
  niche: 'beauty',
  channel: 'telegram_community',
  handle: '@kyla',
};

describe('generateMessage', () => {
  it('D0 社交 DM：含姓名/地区/前两个平台，无主题行', () => {
    const m = generateMessage(lead, 0);
    expect(m.body).toContain('Kyla');
    expect(m.body).toContain('Quezon City, PH');
    expect(m.body).toContain('instagram & tiktok');
    expect(m.body).not.toContain('reddit'); // 只取前两个平台
    expect(m.subject).toBeUndefined();
    expect(m.channel).toBe('telegram_community');
  });

  it('LinkedIn D0 带主题行', () => {
    const m = generateMessage({ ...lead, channel: 'linkedin' }, 0);
    expect(m.subject).toBeTruthy();
    expect(m.body).toContain('Onely');
  });

  it('OnlineJobs D0 为长信格式：含周薪与申请引导', () => {
    const m = generateMessage({ ...lead, channel: 'onlinejobs' }, 0);
    expect(m.subject).toContain('Onely');
    expect(m.body).toContain('Weekly pay');
    expect(m.body).toContain('application form');
  });

  it('三轮文案互不相同', () => {
    const d0 = generateMessage(lead, 0).body;
    const d1 = generateMessage(lead, 1).body;
    const d2 = generateMessage(lead, 2).body;
    expect(new Set([d0, d1, d2]).size).toBe(3);
    expect(d2).toContain('Last call');
  });

  it('缺失字段有兜底', () => {
    const m = generateMessage({ ...lead, first_name: '', location: '', platforms: '[]' }, 0);
    expect(m.body).toContain('there');
    expect(m.body).toContain('your area');
    expect(m.body).toContain('social media');
  });
});

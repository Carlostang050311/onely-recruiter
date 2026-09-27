// 触达文案 v2 —— 6 渠道模板 + D+2/D+4 跟进 bump + 按线索经历信号插入个性化钩子。

import type { Lead } from './types';
import { countryByCode, PLATFORM_LABEL } from './types';

export const TELEGRAM_HANDLE = '@onely_ops';
export const DISCORD_LINK = 'https://discord.gg/onely-ops';
export const WEBSITE = 'https://www.onely.cc';

export interface Template {
  subject: string;
  body: string;
}

export const TEMPLATES: Record<string, Template> = {
  email: {
    subject: "Onely operator role — running US creator accounts (for {{first_name}})",
    body: `Hi {{first_name}},

{{hook_sentence}} I think you'd be a strong fit for Onely's first operator cohort.

Onely is an AI-powered creator business platform in private beta with US and European creators (onely.cc). We're onboarding our first 100 operators to run TikTok / Instagram companion accounts — the same kind of social growth and fan-relationship work you already do, except AI drafts the content, schedules posts and tracks revenue for you.

What operators get:
- $300–800/month per account, paid weekly, with a transparent revenue dashboard
- AI studio that cuts content production time by roughly 70%
- Flexible async hours, a structured 3-day bootcamp, and a team lead for every 20 operators
- Multiple accounts for operators who perform

Would you be open to a 15-minute chat this week? Reply here, or message us on Telegram {{telegram_handle}} and I'll send the one-page program doc + booking link.

Best,
Onely Operator Team
{{website}}`,
  },
  facebook: {
    subject: '',
    body: `Hi {{first_name}} — {{hook_short}}, so I wanted to reach out personally.

We're Onely, an AI-powered creator platform, and we're taking our first 100 operators to run TikTok/Instagram companion accounts for US & European creators. It's paid weekly ($300–800/mo per account), async, and AI handles most content production.

Open to a quick chat? I can send the one-pager here, or find us on Telegram {{telegram_handle}}. Thanks!`,
  },
  linkedin: {
    subject: '',
    body: `Hi {{first_name}}, I came across your work — {{hook_short}}. 

I lead operator growth at Onely, an AI-powered creator business platform. We're selecting our first 100 operators to grow companion accounts for Western creators: weekly pay per account, AI doing the heavy lifting on content, flexible hours.

Given your background, I'd love 15 minutes to share the program. Open to it? I can message you the details here or on Telegram {{telegram_handle}}.`,
  },
  telegram: {
    subject: '',
    body: `Hi {{first_name}} 👋 {{hook_short}} — we'd love to have you in Onely's first operator cohort.

We run TikTok/IG companion accounts for US & European creators. Operators earn $300–800/mo per account, paid weekly, AI handles content drafts. Async + free 3-day training.

Interested? Reply "YES" and I'll send the signup + booking link. Info: {{website}}`,
  },
  whatsapp: {
    subject: '',
    body: `Hi {{first_name}}, this is the Onely operator team. {{hook_short}} We're hiring 100 operators to run TikTok/Instagram companion accounts for US creators — $300–800/mo per account, weekly payouts, AI assists with content, flexible hours. Can I send the one-page info? Reply YES.`,
  },
  x: {
    subject: '',
    body: `Hi {{first_name}} — {{hook_short}} We're onboarding 100 operators to run companion accounts for US/EU creators ($300–800/mo per account, weekly pay, AI does content drafts). Worth a quick look? DM "YES" or Telegram {{telegram_handle}}.`,
  },
};

export const BUMPS: string[] = [
  `Hi {{first_name}}, floating this back up — we're filling the first 100 operator seats this week and yours is one I'd like to hold. A few operators from {{country_name}} already started and received their first payout within 7 days. Want the signup link?`,
  `Last one from me, {{first_name}} — applications for cohort 1 close tomorrow. If now isn't a good time, we also pay a $25 referral bonus for every operator you refer who stays 30 days. Either way, wishing you well! Telegram: {{telegram_handle}}`,
];

export const VAR_NAMES = [
  'first_name',
  'country_name',
  'platforms',
  'us_years',
  'role',
  'source',
  'city',
  'hook_sentence',
  'hook_short',
  'telegram_handle',
  'website',
];

/** 按线索经历信号生成个性化钩子 */
export function personalHooks(l: Lead): string[] {
  const h: string[] = [];
  if (l.rating >= 90) h.push('loved your ' + l.rating + ' client rating on ' + l.source);
  if (l.platforms.includes('tiktok')) h.push('your TikTok growth work for Western creators');
  if ((l.role + l.notes).indexOf('陪伴') >= 0 || (l.role + l.notes).indexOf('companion') >= 0)
    h.push('your experience running companion-style accounts');
  if (l.notes.indexOf('10 万') >= 0 || l.notes.indexOf('100k') >= 0 || l.notes.indexOf('10万') >= 0)
    h.push('you taking accounts from 0 past 100k followers');
  if (l.source === 'X (Twitter)') h.push('your X growth work for international clients');
  if (l.ai_tools) h.push('that you already work with AI tools');
  if ((l.skills || []).includes('DM 转化')) h.push('your DM-to-paid conversion experience');
  if (l.us_years >= 3) h.push('your ' + l.us_years + ' years running accounts for the US market');
  if (!h.length) h.push('your experience managing social for US and European creators');
  return h;
}

export interface BuiltMessage {
  subject: string;
  body: string;
}

/** seq: 0 首触 / 1 D+2 轻推 / 2 D+4 最后触达 */
export function buildMessage(l: Lead, channelKey: string, seq = 0, templates = TEMPLATES): BuiltMessage {
  let tpl: Template;
  if (seq === 1) tpl = { subject: '', body: BUMPS[0] };
  else if (seq === 2) tpl = { subject: '', body: BUMPS[1] };
  else tpl = templates[channelKey] || templates.email;

  const hooks = personalHooks(l);
  const hookSentence = 'I saw ' + hooks[0] + (hooks[1] ? ' and ' + hooks[1] : '') + ',';
  const hookShort = hooks[0];
  const vars: Record<string, string | number> = {
    first_name: l.name.split(' ')[0],
    country_name: countryByCode(l.country).name,
    platforms: (l.platforms || []).map((p) => PLATFORM_LABEL[p] || p).join(' & ') || 'social',
    us_years: l.us_years || 0,
    role: l.role || 'social media manager',
    source: l.source,
    city: l.city || '',
    hook_sentence: hookSentence,
    hook_short: hookShort,
    telegram_handle: TELEGRAM_HANDLE,
    discord_link: DISCORD_LINK,
    website: WEBSITE,
  };
  const fill = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return { subject: tpl.subject ? fill(tpl.subject) : '', body: fill(tpl.body) };
}

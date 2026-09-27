// 个性化触达文案：渠道模板 + 线索变量，D0 首触 / D1 提醒 / D2 最后召集。
// 定位统一用 Onely 官方口径："creator fan-relationship operations"。
// LLM 改写为浏览器端可选增强（在触达页配置中转站直连），服务端不做任意 URL 请求。

import type { LeadRow } from './types';
import { safeParsePlatforms } from './scoring';

export type FollowupDay = 0 | 1 | 2;

export const DAY_LABELS: Record<FollowupDay, string> = {
  0: 'D0 首触',
  1: 'D1 提醒',
  2: 'D2 最后召集',
};

interface ChannelStyle {
  /** 是否带主题行（偏邮件/站内信的渠道） */
  subject: boolean;
}

const CHANNEL_STYLE: Record<string, ChannelStyle> = {
  telegram_community: { subject: false },
  discord_community: { subject: false },
  facebook_group: { subject: false },
  twitter: { subject: false },
  linkedin: { subject: true },
  onlinejobs: { subject: true },
  upwork: { subject: true },
  referral: { subject: false },
};

function vars(lead: Pick<LeadRow, 'first_name' | 'location' | 'platforms' | 'niche'>) {
  const platforms = safeParsePlatforms(lead.platforms);
  return {
    first_name: lead.first_name || 'there',
    location: (lead.location || 'your area').trim(),
    platforms: platforms.slice(0, 2).join(' & ') || 'social media',
    niche: lead.niche || 'creator',
  };
}

function day0(
  v: ReturnType<typeof vars>,
  lead: Pick<LeadRow, 'channel'>
): { subject?: string; body: string } {
  switch (lead.channel) {
    case 'linkedin':
      return {
        subject: 'Fan-relationship operator role — US creators (weekly pay)',
        body: `Hi ${v.first_name}, I'm recruiting operators for Onely (onely.cc), an AI-powered creator platform. Your ${v.platforms} work for US/EU creators stood out. The role: run fan-relationship workflows for US creators on US-hours shifts. Weekly pay, structured training, playbook provided. Would you be open to a quick chat this week?`,
      };
    case 'onlinejobs':
      return {
        subject: 'Onely — Fan Relationship Operator (US shift, weekly pay, fully remote)',
        body: `Hi ${v.first_name},\n\nWe're Onely (onely.cc), an AI-powered creator business platform. We're building our first operator cohort in ${v.location}: running fan-relationship workflows for US creators (replies, welcomes, nurturing — the "relationship" side of the creator business loop).\n\nWhy you: your profile shows ${v.platforms} experience, and that's the core of this job. We provide the playbook, persona training, and QA coaching.\n\n- US-hours shift, fully remote\n- Weekly pay via Payoneer/Wise\n- Start: this week, first cohort\n\nCould you complete our 5-min application form? Top applicants get a paid sample task the same day.`,
      };
    case 'upwork':
      return {
        subject: 'Invitation — Fan Relationship Operator for US creators (Onely)',
        body: `Hi ${v.first_name},\n\nOnely (onely.cc) is an AI-powered creator business platform. We're inviting experienced ${v.platforms} freelancers to join our operator cohort: running fan-relationship workflows for US creators on US-hours shifts. Weekly pay, full training, long-term volume. If this sounds like your lane, happy to send the brief and a paid sample task.`,
      };
    default:
      return {
        body: `Hi ${v.first_name}! I'm with Onely (onely.cc), an AI-powered creator business platform. We're hiring experienced social-media operators in ${v.location} to run fan-relationship workflows for US creators — ${v.platforms} background like yours is exactly what we look for. US-hours shifts, weekly pay, full training provided. Open to a 3-min overview?`,
      };
  }
}

function day1(v: ReturnType<typeof vars>): { subject?: string; body: string } {
  return {
    subject: 'Re: Fan-relationship operator role — cohort fills this week',
    body: `Quick nudge, ${v.first_name} — we're locking the first operator cohort this week and ${v.location} slots are going fast. If the fan-relationship role for US creators sounds interesting, the 5-min form takes one coffee break. Happy to answer questions here too.`,
  };
}

function day2(v: ReturnType<typeof vars>): { subject?: string; body: string } {
  return {
    subject: 'Last call — Onely operator cohort closes tonight',
    body: `Last call, ${v.first_name}! Operator applications close tonight (first cohort, US creators, weekly pay). If you know the ${v.platforms} grind, this is the steady version of it: playbook, training, and QA support included. Form takes 5 minutes — would love to see you in cohort one.`,
  };
}

export interface GeneratedMessage {
  subject?: string;
  body: string;
  day: FollowupDay;
  channel: string;
}

export function generateMessage(
  lead: Pick<LeadRow, 'first_name' | 'location' | 'platforms' | 'niche' | 'channel' | 'handle'>,
  day: FollowupDay
): GeneratedMessage {
  const v = vars(lead);
  const gen = day === 0 ? day0(v, lead) : day === 1 ? day1(v) : day2(v);
  const style = CHANNEL_STYLE[lead.channel] ?? { subject: false };
  return {
    subject: style.subject ? gen.subject : undefined,
    body: gen.body,
    day,
    channel: lead.channel,
  };
}

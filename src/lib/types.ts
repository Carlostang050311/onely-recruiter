// 领域类型与常量。所有模块共享，保持自包含（相对导入）。

export type Channel =
  | 'telegram_community'
  | 'discord_community'
  | 'onlinejobs'
  | 'facebook_group'
  | 'linkedin'
  | 'twitter'
  | 'upwork'
  | 'referral';

export const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'telegram_community', label: 'Telegram 社群' },
  { key: 'discord_community', label: 'Discord 社群' },
  { key: 'onlinejobs', label: 'OnlineJobs.ph' },
  { key: 'facebook_group', label: 'Facebook 群组' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter', label: 'X/Twitter' },
  { key: 'upwork', label: 'Upwork' },
  { key: 'referral', label: '转介绍' },
];

export function channelLabel(key: string): string {
  return CHANNELS.find((c) => c.key === key)?.label ?? key;
}

export type Status =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'applied'
  | 'sample_done'
  | 'offered'
  | 'onboarded'
  | 'rejected';

export const STATUS_FLOW: Status[] = [
  'new',
  'contacted',
  'replied',
  'applied',
  'sample_done',
  'offered',
  'onboarded',
];

export const STATUS_LABELS: Record<Status, string> = {
  new: '新线索',
  contacted: '已触达',
  replied: '已回复',
  applied: '已报名',
  sample_done: '样题完成',
  offered: '已发 Offer',
  onboarded: '已入驻',
  rejected: '已淘汰',
};

/** 每个推进动作对应写入的时间戳字段 */
export const STATUS_TS: Record<Exclude<Status, 'new'>, string> = {
  contacted: 'contacted_at',
  replied: 'replied_at',
  applied: 'applied_at',
  sample_done: 'sample_done_at',
  offered: 'offered_at',
  onboarded: 'onboarded_at',
  rejected: 'rejected_at',
};

export type Tier = 'A' | 'B' | 'C';

/** 数据库行结构（snake_case 与表结构一致） */
export interface LeadRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  handle: string | null;
  location: string | null;
  channel: Channel;
  platforms: string; // JSON array string
  us_clients_exp: number;
  chat_exp: number;
  crm_exp: number;
  hours_per_week: number;
  us_shift: number;
  english_sample: number; // 0-25
  device_ok: number;
  backup_internet: number;
  niche: string | null;
  source_url: string | null;
  score: number | null;
  tier: Tier | null;
  status: Status;
  outreach_message: string | null;
  outreach_day: number | null;
  next_followup_at: string | null;
  contacted_at: string | null;
  replied_at: string | null;
  applied_at: string | null;
  sample_done_at: string | null;
  offered_at: string | null;
  onboarded_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  created_at: string;
}

/** 导入时的中间结构（解析产物，未打分） */
export interface LeadInput {
  first_name: string;
  last_name?: string;
  email?: string;
  handle?: string;
  location?: string;
  channel: Channel;
  platforms: string[];
  us_clients_exp?: boolean | number;
  chat_exp?: boolean | number;
  crm_exp?: boolean | number;
  hours_per_week?: number;
  us_shift?: boolean | number;
  english_sample?: number;
  device_ok?: boolean | number;
  backup_internet?: boolean | number;
  niche?: string;
  source_url?: string;
}

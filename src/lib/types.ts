// 领域模型 v2 —— 与参照稿《Onely 运营招募作战台》完全对齐。

export type Status = 'new' | 'contacted' | 'replied' | 'qualified' | 'onboarded' | 'lost';

export const STATUSES: { key: Status; label: string; color: string }[] = [
  { key: 'new', label: '新线索', color: '#b39e98' },
  { key: 'contacted', label: '已触达', color: '#8ea2c4' },
  { key: 'replied', label: '已回复', color: '#e8c796' },
  { key: 'qualified', label: '通过筛选', color: '#b794d1' },
  { key: 'onboarded', label: '已入驻', color: '#86ad88' },
  { key: 'lost', label: '流失', color: '#87726c' },
];

export const STAGE_KEYS: Status[] = ['new', 'contacted', 'replied', 'qualified', 'onboarded'];

export function statusMeta(key: string) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0];
}

export const SOURCES = [
  'OnlineJobs.ph',
  'Upwork',
  'Facebook 群组',
  'LinkedIn',
  'X (Twitter)',
  'Telegram 群',
  'Discord 社区',
  'Reddit',
  'Himalayas/Remotive',
  '人才内推',
];

export const COUNTRIES = [
  { code: 'PH', flag: '🇵🇭', name: '菲律宾', cities: ['Manila', 'Cebu', 'Davao', 'Quezon City', 'Iloilo', 'Cagayan de Oro'] },
  { code: 'NG', flag: '🇳🇬', name: '尼日利亚', cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Benin City', 'Enugu'] },
  { code: 'KE', flag: '🇰', name: '肯尼亚', cities: ['Nairobi', 'Mombasa', 'Kisumu'] },
  { code: 'ZA', flag: '🇿🇦', name: '南非', cities: ['Johannesburg', 'Cape Town', 'Durban'] },
  { code: 'IN', flag: '🇮🇳', name: '印度', cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad'] },
  { code: 'GH', flag: '🇬🇭', name: '加纳', cities: ['Accra', 'Kumasi'] },
];

export const ALL_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'threads'];
export const PLATFORM_LABEL: Record<string, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
  threads: 'Threads',
};

/** 触达渠道（文案模板维度） */
export const CHANNELS = [
  { key: 'email', label: '邮件' },
  { key: 'facebook', label: 'Facebook DM' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'x', label: 'X DM' },
];

export type Tier = 'S' | 'A' | 'B' | 'C';
export type EnglishLevel = 'native' | 'fluent' | 'conversational';

export interface Activity {
  t: string; // YYYY-MM-DD
  text: string;
}

export interface LeadMessage {
  channel: string;
  seq: number; // 0 首触 / 1 D+2 / 2 D+4
  subject: string;
  body: string;
  t: string;
}

/** API / UI 层结构（数组已解析） */
export interface Lead {
  id: string;
  name: string;
  country: string;
  city: string;
  source: string;
  profile_url: string;
  email: string;
  phone: string;
  telegram: string;
  platforms: string[];
  us_years: number;
  english: EnglishLevel;
  rating: number;
  hours_per_week: number;
  timezone_overlap: number;
  ai_tools: number; // 0/1
  skills: string[];
  role: string;
  client_type: string;
  notes: string;
  score: number;
  tier: Tier;
  status: Status;
  messages: LeadMessage[];
  activities: Activity[];
  created_at: string;
  last_contact_at: string | null;
  next_followup_at: string | null;
  dup_count: number;
}

/** SQLite 行结构（JSON 字段为字符串） */
export type LeadRow = Omit<Lead, 'platforms' | 'skills' | 'messages' | 'activities'> & {
  platforms: string;
  skills: string;
  messages: string;
  activities: string;
};

export function rowToLead(row: LeadRow): Lead {
  const parse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return [];
    }
  };
  return {
    ...row,
    platforms: parse(row.platforms) as string[],
    skills: parse(row.skills) as string[],
    messages: parse(row.messages) as LeadMessage[],
    activities: parse(row.activities) as Activity[],
  };
}

export function countryByCode(code: string) {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function countryByAny(v: unknown) {
  const s = String(v ?? '').trim();
  let c = COUNTRIES.find((x) => x.code.toLowerCase() === s.toLowerCase() || x.name === s);
  if (!c) c = COUNTRIES.find((x) => s.indexOf(x.name.slice(0, 2)) === 0);
  return c ?? COUNTRIES[0];
}

export function todayStr(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(s: string | null): string {
  if (!s) return '—';
  return s.slice(5).replace('-', '/');
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 864e5);
}

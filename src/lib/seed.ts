// 演示数据：134 条虚构线索，覆盖 8 渠道 × 全漏斗状态，时间线分布在 3 天冲刺内。
// 全部人物为虚构（固定随机种子生成，可复现）。不含任何真实个人信息。
// 第 1 条固定为去重演示锚点（paolo.reyes88@gmail.com），示例 CSV 会再次导入该邮箱。

import type { DatabaseSync } from 'node:sqlite';
import { scoreLead } from './scoring';
import type { Channel, Status } from './types';

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOLS: Record<string, { first: string[]; last: string[]; cities: string[] }> = {
  ph: {
    first: ['Maria', 'Angel', 'Jericho', 'Kyla', 'Andrea', 'Joshua', 'Camille', 'Miguel', 'Bea', 'Rafael', 'Trisha', 'Kevin', 'Nikki', 'Francis', 'Liza', 'Marco', 'Sofia', 'Dennis', 'Grace'],
    last: ['Santos', 'Reyes', 'Dela Cruz', 'Bautista', 'Villanueva', 'Garcia', 'Mendoza', 'Torres', 'Aquino', 'Castro'],
    cities: ['Manila', 'Cebu City', 'Davao', 'Pampanga', 'Quezon City'],
  },
  ng: {
    first: ['Chiamaka', 'Emeka', 'Adaeze', 'Tunde', 'Funmi', 'Blessing', 'Kelechi', 'Ngozi', 'Segun', 'Amara', 'Chidi', 'Yemi', 'Obinna', 'Halima', 'Femi', 'Zainab'],
    last: ['Okafor', 'Adebayo', 'Eze', 'Balogun', 'Okonkwo', 'Adeyemi', 'Chukwu', 'Olawale', 'Nwosu', 'Abiola'],
    cities: ['Lagos', 'Ibadan', 'Abuja', 'Port Harcourt', 'Benin City'],
  },
  ke: {
    first: ['Wanjiku', 'Brian', 'Amina', 'Collins', 'Faith', 'Mercy', 'Otieno', 'Sharon', 'Victor'],
    last: ['Wanjiru', 'Kamau', 'Achieng', 'Mwangi', 'Njoroge', 'Chebet', 'Odhiambo'],
    cities: ['Nairobi', 'Mombasa', 'Kisumu'],
  },
};

const NICHES = ['fitness', 'lifestyle', 'gaming', 'finance', 'beauty', 'travel', 'music', 'anime'];
const PLATFORM_POOL = ['instagram', 'tiktok', 'x', 'reddit', 'youtube'];

const CHANNEL_DIST: [Channel, number][] = [
  ['telegram_community', 22],
  ['onlinejobs', 20],
  ['facebook_group', 18],
  ['linkedin', 12],
  ['discord_community', 8],
  ['twitter', 8],
  ['upwork', 7],
  ['referral', 5],
];

const STATUS_DIST: [Status, number][] = [
  ['new', 8],
  ['contacted', 15],
  ['replied', 11],
  ['applied', 12],
  ['sample_done', 13],
  ['offered', 14],
  ['onboarded', 61],
];

const INSERT_SQL = `INSERT INTO leads (
  first_name, last_name, email, handle, location, channel, platforms,
  us_clients_exp, chat_exp, crm_exp, hours_per_week, us_shift, english_sample,
  device_ok, backup_internet, niche, source_url, score, tier, status,
  outreach_message, outreach_day, next_followup_at,
  contacted_at, replied_at, applied_at, sample_done_at, offered_at, onboarded_at, rejected_at,
  notes, created_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

function pickChannel(rnd: () => number): Channel {
  const total = CHANNEL_DIST.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * total;
  for (const [ch, w] of CHANNEL_DIST) {
    x -= w;
    if (x <= 0) return ch;
  }
  return 'facebook_group';
}

function pickCountry(rnd: () => number): 'ph' | 'ng' | 'ke' {
  const x = rnd();
  return x < 0.55 ? 'ph' : x < 0.87 ? 'ng' : 'ke';
}

export function ensureSeeded(db: DatabaseSync): void {
  const rnd = mulberry32(20260927);
  const now = Date.now();
  const start = now - 62 * 3600_000; // 冲刺开始于 ~2.6 天前（现在是第 3 天上午）
  const day1End = start + 24 * 3600_000;
  const day2End = start + 48 * 3600_000;
  const gap = (h: number) => Math.round(h * 3600_000);

  const stmt = db.prepare(INSERT_SQL);

  // 展开状态分布并洗牌
  const statuses: Status[] = [];
  for (const [s, n] of STATUS_DIST) for (let k = 0; k < n; k++) statuses.push(s);
  for (let k = statuses.length - 1; k > 0; k--) {
    const j = Math.floor(rnd() * (k + 1));
    [statuses[k], statuses[j]] = [statuses[j], statuses[k]];
  }
  // 已入驻者按天分布：D1 22 / D2 28 / D3 11
  let onboardCount = 0;
  const onboardDayOf = (idx: number): number => {
    if (statuses[idx] !== 'onboarded') return 0;
    onboardCount += 1;
    return onboardCount <= 22 ? 1 : onboardCount <= 50 ? 2 : 3;
  };
  const dayOf = statuses.map((_, idx) => onboardDayOf(idx));

  for (let k = 0; k < statuses.length; k++) {
    const status = statuses[k];
    const i = k + 1;

    // 第 1 条固定为去重锚点
    const anchor = i === 1;
    let first: string;
    let last: string;
    let country: 'ph' | 'ng' | 'ke';
    let city: string;
    if (anchor) {
      first = 'Paolo';
      last = 'Reyes';
      country = 'ph';
      city = 'Manila';
    } else {
      country = pickCountry(rnd);
      const pool = POOLS[country];
      first = pool.first[Math.floor(rnd() * pool.first.length)];
      last = pool.last[Math.floor(rnd() * pool.last.length)];
      city = pool.cities[Math.floor(rnd() * pool.cities.length)];
    }

    const channel: Channel = anchor ? 'telegram_community' : pickChannel(rnd);
    const baseId = 100 + i;
    const email = anchor
      ? 'paolo.reyes88@gmail.com'
      : `${first}.${last}${baseId}`.toLowerCase().replace(/[^a-z0-9.]/g, '') + '@gmail.com';
    const handle = anchor ? '@paoloreyes' : `@${(first + last + baseId).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const platCount = 1 + Math.floor(rnd() * 3);
    const shuffled = [...PLATFORM_POOL].sort(() => rnd() - 0.5);
    const platforms = shuffled.slice(0, platCount);

    const deep = status === 'sample_done' || status === 'offered' || status === 'onboarded';
    const lead = {
      first_name: first,
      last_name: last,
      email,
      handle,
      location: `${city}, ${country.toUpperCase()}`,
      channel,
      platforms: JSON.stringify(platforms),
      us_clients_exp: anchor ? 1 : rnd() < 0.75 ? 1 : 0,
      chat_exp: anchor ? 1 : rnd() < 0.65 ? 1 : 0,
      crm_exp: anchor ? 1 : rnd() < 0.45 ? 1 : 0,
      hours_per_week: anchor ? 35 : rnd() < 0.8 ? 20 + Math.floor(rnd() * 21) : 10 + Math.floor(rnd() * 8),
      us_shift: anchor ? 1 : rnd() < 0.88 ? 1 : 0,
      english_sample: deep ? 14 + Math.floor(rnd() * 11) : anchor ? 22 : 6 + Math.floor(rnd() * 14),
      device_ok: 1,
      backup_internet: rnd() < 0.8 ? 1 : 0,
      niche: anchor ? 'lifestyle' : NICHES[Math.floor(rnd() * NICHES.length)],
      source_url: '',
      status,
    };
    const { score, tier } = scoreLead(lead);

    // 时间线：按最终状态定锚点时间，再往前推各阶段
    let anchorTs: number;
    if (status === 'onboarded') {
      const d = dayOf[k];
      const dayStart = d === 1 ? start : d === 2 ? day1End : day2End;
      const dayLen = d === 3 ? now - day2End : 24 * 3600_000;
      anchorTs = dayStart + Math.floor(rnd() * Math.max(dayLen - 600_000, 600_000));
    } else if (status === 'new') {
      anchorTs = start + Math.floor(rnd() * (now - start));
    } else {
      anchorTs = day1End + Math.floor(rnd() * (now - day1End));
      if (status === 'contacted' && rnd() < 0.5) anchorTs = start + Math.floor(rnd() * (day1End - start));
    }

    const onboarded_at = status === 'onboarded' ? new Date(anchorTs).toISOString() : null;
    const offered_at =
      status === 'onboarded'
        ? new Date(Math.max(start, anchorTs - gap(6 + rnd() * 10))).toISOString()
        : status === 'offered'
          ? new Date(anchorTs).toISOString()
          : null;
    const sample_done_at =
      offered_at
        ? new Date(Math.max(start, new Date(offered_at).getTime() - gap(2 + rnd() * 8))).toISOString()
        : status === 'sample_done'
          ? new Date(anchorTs).toISOString()
          : null;
    const applied_at =
      sample_done_at
        ? new Date(Math.max(start, new Date(sample_done_at).getTime() - gap(2 + rnd() * 8))).toISOString()
        : status === 'applied'
          ? new Date(anchorTs).toISOString()
          : null;
    const replied_at =
      applied_at
        ? new Date(Math.max(start, new Date(applied_at).getTime() - gap(1 + rnd() * 5))).toISOString()
        : status === 'replied'
          ? new Date(anchorTs).toISOString()
          : null;
    const contacted_at =
      replied_at
        ? new Date(Math.max(start, new Date(replied_at).getTime() - gap(1 + rnd() * 4))).toISOString()
        : status === 'contacted'
          ? new Date(anchorTs).toISOString()
          : null;
    const created_at = contacted_at
      ? new Date(Math.max(start, new Date(contacted_at).getTime() - gap(0.5 + rnd() * 5))).toISOString()
      : new Date(anchorTs).toISOString();

    // 跟进提醒：已触达未回复 → 触达后 24h；已发 offer 未接受 → offer 后 24h
    let next_followup_at: string | null = null;
    if (status === 'contacted' && contacted_at)
      next_followup_at = new Date(new Date(contacted_at).getTime() + gap(24)).toISOString();
    if (status === 'offered' && offered_at)
      next_followup_at = new Date(new Date(offered_at).getTime() + gap(24)).toISOString();

    const demoMessage =
      status === 'new' || status === 'contacted'
        ? null
        : `Hi ${first}! Quick reminder — your operator cohort slot for US creators is waiting. Form takes 5 minutes, weekly pay, US-hours shift.`;

    stmt.run(
      lead.first_name, lead.last_name, lead.email, lead.handle, lead.location, lead.channel, lead.platforms,
      lead.us_clients_exp, lead.chat_exp, lead.crm_exp, lead.hours_per_week, lead.us_shift, lead.english_sample,
      lead.device_ok, lead.backup_internet, lead.niche, lead.source_url, score, tier, lead.status,
      demoMessage, demoMessage ? 1 : null, next_followup_at,
      contacted_at, replied_at, applied_at, sample_done_at, offered_at, onboarded_at, null,
      '', created_at
    );
  }

  db.prepare(
    'INSERT INTO imports (filename, total_rows, inserted, duplicates, created_at) VALUES (?,?,?,?,?)'
  ).run('seed-batch.csv', statuses.length, statuses.length, 0, new Date(start).toISOString());
}

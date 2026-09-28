// 演示数据 v2 —— 移植参照稿 seedData：54 条虚构线索，预置漏斗 7 入驻 / 6 通过 / 9 回复 / 15 触达 / 17 新。
// 固定随机种子 20260927，可复现。

import type { Db as DatabaseSync } from './sqljs';
import { grade } from './scoring';
import type { Lead, Status } from './types';
import { COUNTRIES, SOURCES, countryByCode, addDays, todayStr } from './types';

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

const PH_F = ['Maria', 'Jessa', 'Angelica', 'Riza', 'Krizel', 'Hannah', 'Princess', 'Lovely', 'Trisha', 'Mae', 'Jonalyn', 'Shiela', 'Czareena', 'Ella', 'Nikka', 'Abegail', 'Roxanne', 'Clarisse', 'Gwen', 'Arra'];
const PH_L = ['Reyes', 'Cruz', 'Santos', 'Garcia', 'Mendoza', 'Torres', 'Bautista', 'Dela Cruz', 'Flores', 'Ramos', 'Gonzales', 'Castillo', 'Aquino', 'Pascual', 'Soriano', 'Manalo', 'Villanueva', 'Ocampo', 'Salvador', 'Corpuz'];
const NG_F = ['Blessing', 'Chiamaka', 'Halimah', 'Ayomide', 'Tosin', 'Precious', 'Chioma', 'Damilola', 'Folake', 'Ngozi', 'Emmanuel', 'Tobi', 'Aisha', 'Oluchi', 'Kemi', 'Ifeanyi', 'Zainab', 'Chidinma', 'Yewande', 'Bukola'];
const NG_L = ['Okafor', 'Adeyemi', 'Bello', 'Eze', 'Olawale', 'Aigbe', 'Chika', 'Adeniyi', 'Oyelaran', 'Mbadiwe', 'Salami', 'Ibrahim', 'Ogundimu', 'Balogun', 'Nwosu', 'Adeleke', 'Okonkwo', 'Dare', 'Ekpo', 'Lawal'];

function slug(n: string) {
  return n.toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
}
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function profileFor(src: string, name: string, ri: (a: number, b: number) => number): string {
  const s = slug(name);
  const r = ri(1000, 99999);
  switch (src) {
    case 'OnlineJobs.ph': return 'https://www.onlinejobs.ph/jobseekers/' + r;
    case 'Upwork': return 'https://www.upwork.com/freelancers/~01' + Math.abs(hash(s)).toString(16).padStart(10, '0').slice(0, 10);
    case 'LinkedIn': return 'https://www.linkedin.com/in/' + s + '-' + ri(10, 99);
    case 'X (Twitter)': return 'https://x.com/' + s.replace(/\./g, '_') + ri(1, 99);
    case 'Facebook 群组': return 'https://facebook.com/' + s + '.' + r;
    case 'Telegram 群': return 'https://t.me/' + s.replace(/\./g, '_');
    case 'Discord 社区': return 'discord:' + s.replace(/\./g, '') + '_' + ri(10, 99);
    case 'Reddit': return 'https://reddit.com/user/' + s.replace(/\./g, '_');
    default: return 'https://himalayas.app/people/' + s + '-' + r;
  }
}

const SKILL_SETS = [
  ['Canva', 'CapCut', '文案写作'],
  ['ChatGPT', 'Metricool', 'Later'],
  ['CapCut', 'ChatGPT', '钩子写作'],
  ['Canva', 'Buffer', '社群互动'],
  ['ChatGPT', 'Midjourney', 'CapCut'],
  ['Later', '短视频剪辑', 'DM 转化'],
];
const NOTES_POOL = [
  '目前为 2 位美国创作者代管 TikTok 与 IG，夜班时段在线。',
  '有陪伴类/人物设定账号运营经验，熟悉 DM 转化话术。',
  '在 Upwork 长期服务欧美客户，寻求更稳定的收入来源。',
  '管理过 3 个 TikTok 账号从 0 到 10 万粉，擅长钩子脚本。',
  'Facebook VA 群组活跃成员，可带动同行加入。',
  '英语写作流利，使用 ChatGPT 完成每日内容排期。',
  '',
];
const ROLES = ['美国创作者社媒代管', 'TikTok 机构运营', 'Instagram 增长运营', 'OnlyFans 工作室运营', '电商品牌社媒 VA', '情感/陪伴类账号运营', '个人品牌内容 VA'];

export function buildSeedLeads(): Lead[] {
  const rnd = mulberry32(20260927);
  // 独立随机源：仅用于入驻日期锚定，避免扰动主序列（保证演示数据与参照稿一致）
  const rnd2 = mulberry32(777);
  const ri2 = (a: number, b: number) => a + Math.floor(rnd2() * (b - a + 1));
  const rp = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const rc = (p: number) => rnd() < p;
  const today = todayStr();

  const leads: Lead[] = [];
  const used = new Set<string>();

  for (let i = 0; i < 54; i++) {
    const isPH = rc(0.62);
    const code = isPH ? 'PH' : rc(0.8) ? 'NG' : rp(['KE', 'ZA', 'IN', 'GH']);
    const c = countryByCode(code);
    const name = (isPH ? rp(PH_F) : rp(NG_F)) + ' ' + (isPH ? rp(PH_L) : rp(NG_L));
    const source =
      code === 'PH'
        ? rp(['OnlineJobs.ph', 'Upwork', 'Facebook 群组', 'Facebook 群组', 'LinkedIn', 'Telegram 群', 'Reddit'])
        : rp(['X (Twitter)', 'LinkedIn', 'Telegram 群', 'Upwork', 'Discord 社区', 'Facebook 群组', 'Himalayas/Remotive']);
    const platforms: string[] = [];
    (['tiktok', 'instagram', 'facebook', 'x', 'youtube', 'threads'] as const).forEach((p) => {
      const base = { tiktok: 0.8, instagram: 0.78, facebook: 0.6, x: 0.42, youtube: 0.33, threads: 0.3 }[p];
      if (rc(base)) platforms.push(p);
    });
    if (!platforms.length) platforms.push('instagram');

    const lead: Lead = {
      id: 'L' + String(i + 1).padStart(3, '0'),
      name,
      country: code,
      city: rp(c.cities),
      source,
      profile_url: profileFor(source, name, ri),
      email: slug(name) + '@gmail.com',
      phone: code === 'PH' ? '+639' + ri(100000000, 999999999) : '+234' + ri(7000000000, 9099999999),
      telegram: '@' + slug(name).replace(/\./g, '_'),
      platforms,
      us_years: rc(0.25) ? ri(3, 6) : rc(0.5) ? ri(1, 2) : 0,
      english: code === 'NG' ? (rc(0.55) ? 'native' : 'fluent') : rc(0.3) ? 'native' : rc(0.75) ? 'fluent' : 'conversational',
      rating: rc(0.15) ? 0 : ri(62, 100),
      hours_per_week: rp([4, 8, 10, 15, 20, 25, 30, 35, 40, 40]),
      timezone_overlap: ri(1, 6),
      ai_tools: rc(0.72) ? 1 : 0,
      skills: rp(SKILL_SETS),
      client_type: rc(0.7) ? 'us_creator' : rc(0.5) ? 'eu_creator' : 'agency',
      role: rp(ROLES),
      notes: rp(NOTES_POOL),
      score: 0,
      tier: 'C',
      status: 'new',
      messages: [],
      activities: [],
      created_at: addDays(today, -ri(0, 4)),
      last_contact_at: null,
      next_followup_at: null,
      dup_count: 0,
    };

    // 邮箱 / Telegram / 主页链接唯一化，避免同名造成伪重复
    let n = 2;
    const eb = lead.email.replace('@gmail.com', '');
    while (used.has(lead.email)) { lead.email = eb + n + '@gmail.com'; n++; }
    used.add(lead.email);
    n = 2;
    const tb = lead.telegram;
    while (used.has(lead.telegram)) { lead.telegram = tb + n; n++; }
    used.add(lead.telegram);
    n = 2;
    const ub = lead.profile_url;
    while (used.has(lead.profile_url)) { lead.profile_url = ub + (ub.indexOf('?') >= 0 ? '&' : '?') + 'u' + n; n++; }
    used.add(lead.profile_url);

    grade(lead);

    // 预置漏斗：7 入驻 / 6 通过 / 9 回复 / 15 触达 / 17 新
    const target: Status = i < 7 ? 'onboarded' : i < 13 ? 'qualified' : i < 22 ? 'replied' : i < 37 ? 'contacted' : 'new';
    // 入驻者的阶段日期锚定在最近三个战役日内，供「每日入驻节奏」图使用真实数据
    let base = lead.created_at;
    if (target === 'onboarded') {
      base = addDays(today, -ri2(0, 2));
      lead.created_at = addDays(base, -ri2(4, 6));
    }
    lead.activities.push({ t: lead.created_at, text: '线索入库（' + lead.source + '）' });
    const order: Status[] = ['new', 'contacted', 'replied', 'qualified', 'onboarded'];
    const ti = order.indexOf(target);
    for (let k = 1; k <= ti; k++) {
      const st = order[k];
      const dt = target === 'onboarded' ? addDays(base, k - 4) : addDays(lead.created_at, k - 1 > 0 ? 1 : 0);
      if (st === 'contacted') {
        lead.last_contact_at = dt;
        lead.next_followup_at = addDays(dt, 2);
      }
      if (st === 'replied') lead.next_followup_at = null;
      if (st === 'onboarded') {
        lead.activities.push({ t: dt, text: '加入 Discord 并完成入驻清单，分配首个账号' });
      } else {
        const label = { new: '新线索', contacted: '已触达', replied: '已回复', qualified: '通过筛选', onboarded: '已入驻', lost: '流失' }[st];
        lead.activities.push({ t: dt, text: label });
      }
      lead.status = st;
    }
    if (lead.status === 'contacted' && rc(0.55)) lead.next_followup_at = addDays(today, ri(-1, 1));
    if (lead.status === 'replied') lead.next_followup_at = addDays(today, ri(0, 1));
    leads.push(lead);
  }
  return leads;
}

const INSERT_SQL = `INSERT INTO leads (
  id, name, country, city, source, profile_url, email, phone, telegram,
  platforms, us_years, english, rating, hours_per_week, timezone_overlap, ai_tools,
  skills, role, client_type, notes, score, tier, status, messages, activities,
  created_at, last_contact_at, next_followup_at, dup_count
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

export function ensureSeeded(db: DatabaseSync): void {
  const stmt = db.prepare(INSERT_SQL);
  for (const l of buildSeedLeads()) {
    stmt.run(
      l.id, l.name, l.country, l.city, l.source, l.profile_url, l.email, l.phone, l.telegram,
      JSON.stringify(l.platforms), l.us_years, l.english, l.rating, l.hours_per_week, l.timezone_overlap, l.ai_tools,
      JSON.stringify(l.skills), l.role, l.client_type, l.notes, l.score, l.tier, l.status,
      JSON.stringify(l.messages), JSON.stringify(l.activities),
      l.created_at, l.last_contact_at, l.next_followup_at, l.dup_count
    );
  }
  db.prepare(
    'INSERT INTO imports (filename, total_rows, inserted, duplicates, created_at) VALUES (?,?,?,?,?)'
  ).run('seed-batch.csv', 54, 54, 0, todayStr());
}

export { SOURCES };

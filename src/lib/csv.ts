// CSV 解析 v2 —— 保留通用解析器，新增参照稿的表头别名映射与 rowToLead。

import { parseCsvTable, toBool, toInt } from './csv-base';
import type { EnglishLevel, Lead } from './types';
import { ALL_PLATFORMS, countryByAny, todayStr } from './types';
import { grade } from './scoring';

export { parseCsv, parseCsvTable, toBool, toInt, toEnglishScore } from './csv-base';

const ALIAS: Record<string, string[]> = {
  name: ['name', 'full_name', '姓名'],
  email: ['email', '邮箱'],
  country: ['country', '国家'],
  city: ['city', '城市'],
  source: ['source', '来源'],
  profile_url: ['profile_url', 'url', '链接'],
  phone: ['phone', '电话'],
  telegram: ['telegram'],
  platforms: ['platforms', '平台'],
  us_years: ['us_years', '经验'],
  english: ['english', '英语'],
  rating: ['rating', '评分'],
  hours: ['hours', '小时'],
  timezone_overlap: ['timezone_overlap', '时区'],
  ai_tools: ['ai_tools', 'ai'],
  skills: ['skills'],
  role: ['role'],
  notes: ['notes', '备注'],
};

export interface ParsedImport {
  leads: Lead[];
  invalid: number;
  total: number;
}

let seqCounter = 0;
export function nextId(prefix = 'L'): string {
  seqCounter += 1;
  return prefix + String(Date.now() % 100000) + String(seqCounter).padStart(3, '0');
}

export function parseImport(text: string, sources: string[], idGen: () => string): ParsedImport {
  const { headers, rows } = parseCsvTable(text);
  const hmap: Record<string, number> = {};
  Object.keys(ALIAS).forEach((k) => {
    ALIAS[k].forEach((a) => {
      const i = headers.indexOf(a);
      if (i >= 0 && hmap[k] === undefined) hmap[k] = i;
    });
  });
  const rawRows = parseCsvTable(text).rows;
  const leads: Lead[] = [];
  let invalid = 0;
  for (const r of rawRows) {
    const g = (k: string) => (hmap[k] === undefined ? '' : String(r[headers[hmap[k]]] ?? '').trim());
    const name = g('name');
    const email = g('email');
    if (!name && !email) {
      invalid += 1;
      continue;
    }
    const c = countryByAny(g('country'));
    const engRaw = g('english');
    const english: EnglishLevel = (['native', 'fluent', 'conversational'] as EnglishLevel[]).includes(
      engRaw as EnglishLevel
    )
      ? (engRaw as EnglishLevel)
      : engRaw.indexOf('母') >= 0
        ? 'native'
        : 'fluent';
    const lead: Lead = {
      id: idGen(),
      name: name || '(未命名)',
      country: c.code,
      city: g('city'),
      source: sources.includes(g('source')) ? g('source') : g('source') || '手动导入',
      profile_url: g('profile_url'),
      email,
      phone: g('phone'),
      telegram: g('telegram'),
      platforms: (g('platforms') || '')
        .split(/[,，\/]/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALL_PLATFORMS.includes(s)),
      us_years: toInt(g('us_years')),
      english,
      rating: toInt(g('rating')),
      hours_per_week: toInt(g('hours')),
      timezone_overlap: toInt(g('timezone_overlap')),
      ai_tools: toBool(g('ai_tools')) ? 1 : 0,
      skills: (g('skills') || '').split(/[,，]/).filter(Boolean),
      role: g('role'),
      client_type: '',
      notes: g('notes'),
      score: 0,
      tier: 'C',
      status: 'new',
      messages: [],
      activities: [{ t: todayStr(), text: '线索入库（导入）' }],
      created_at: todayStr(),
      last_contact_at: null,
      next_followup_at: null,
      dup_count: 0,
    };
    grade(lead);
    leads.push(lead);
  }
  return { leads, invalid, total: rawRows.length };
}

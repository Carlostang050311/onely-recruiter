// 静态模式（GitHub Pages）客户端数据引擎：localStorage 持久化，与参照稿同架构。
// 服务端模式不使用本文件。
import type { Lead } from './types';
import { buildSeedLeads } from './seed';
import { todayStr } from './types';

export interface SampleRow {
  lead_id: string;
  token: string;
  sent_at: string | null;
  submitted_at: string | null;
  answers: string[];
  machine_score: number | null;
  machine_parts: { k: string; w: number; v: number; d: string }[];
  human_score: number | null;
  status: 'sent' | 'submitted';
}

export interface CorrectionRow {
  id: number;
  lead_id: string;
  machine: number;
  human: number;
  delta: number;
  ts: string;
  actor: string;
}

export interface AuditRowC {
  id: number;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
}

export interface ClientState {
  leads: Lead[];
  samples: SampleRow[];
  corrections: CorrectionRow[];
  audit: AuditRowC[];
  sends: { channel: string; day: string }[];
  session: { user: string; role: string } | null;
  seq: number;
}

const KEY = 'onely_static_v1';
let state: ClientState | null = null;

function seeded(): ClientState {
  return {
    leads: buildSeedLeads(),
    samples: [],
    corrections: [],
    audit: [],
    sends: [],
    session: null,
    seq: 1000,
  };
}

export function db(): ClientState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = JSON.parse(raw) as ClientState;
      return state;
    }
  } catch {
    /* fall through to seed */
  }
  state = seeded();
  save();
  return state;
}

export function save(): void {
  if (state) localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState(): void {
  state = seeded();
  save();
}

export function auditC(action: string, entity: string, detail = '', actor?: string): void {
  const s = db();
  s.audit.unshift({
    id: s.audit.length + 1,
    ts: new Date().toISOString(),
    actor: actor ?? s.session?.user ?? 'system',
    action,
    entity,
    detail,
  });
  save();
}

export function nextLeadId(): string {
  const s = db();
  let max = 0;
  for (const l of s.leads) {
    const m = l.id.match(/^L(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'L' + String(max + 1).padStart(3, '0');
}

export function logSendC(channel: string): void {
  const s = db();
  s.sends.push({ channel, day: todayStr() });
  save();
}

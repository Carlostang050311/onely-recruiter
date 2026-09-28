// SQLite 访问层：sql.js（WASM）单驱动，本地 / Vercel / Netlify 通用。
// 本地落盘 data/app.db；无服务器环境落 /tmp（暖实例级持久，冷启动自动重灌种子）。
// 路由分发层须先 await ensureDb()。

import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Db, openDb } from './sqljs';
import { ensureSeeded } from './seed';

export type DatabaseSync = Db;

const IS_SERVERLESS = !!(
  process.env.VERCEL ||
  process.env.NETLIFY ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME
);
const DATA_DIR = IS_SERVERLESS ? process.env.TMP || '/tmp' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT DEFAULT 'PH',
    city TEXT DEFAULT '',
    source TEXT DEFAULT '',
    profile_url TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    telegram TEXT DEFAULT '',
    platforms TEXT DEFAULT '[]',
    us_years INTEGER DEFAULT 0,
    english TEXT DEFAULT 'conversational',
    rating INTEGER DEFAULT 0,
    hours_per_week INTEGER DEFAULT 0,
    timezone_overlap INTEGER DEFAULT 0,
    ai_tools INTEGER DEFAULT 0,
    skills TEXT DEFAULT '[]',
    role TEXT DEFAULT '',
    client_type TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    score INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'C',
    status TEXT DEFAULT 'new',
    messages TEXT DEFAULT '[]',
    activities TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    last_contact_at TEXT,
    next_followup_at TEXT,
    dup_count INTEGER DEFAULT 0
  )`,
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier)',
  'CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)',
  `CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    total_rows INTEGER,
    inserted INTEGER,
    duplicates INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sends_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT, channel TEXT, mode TEXT, day TEXT, ts TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS samples (
    lead_id TEXT PRIMARY KEY,
    token TEXT UNIQUE,
    sent_at TEXT, submitted_at TEXT,
    answers TEXT DEFAULT '[]',
    machine_score INTEGER, machine_parts TEXT DEFAULT '[]',
    human_score INTEGER, status TEXT DEFAULT 'sent'
  )`,
  `CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT, machine INTEGER, human INTEGER, delta INTEGER, ts TEXT, actor TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT, actor TEXT, action TEXT, entity TEXT, detail TEXT
  )`,
];

let instance: Db | null = null;
let loading: Promise<Db> | null = null;

export async function ensureDb(): Promise<Db> {
  if (instance) return instance;
  if (!loading) loading = load();
  return loading;
}

async function load(): Promise<Db> {
  if (!IS_SERVERLESS) mkdirSync(DATA_DIR, { recursive: true });
  const db = await openDb(DB_PATH);
  db.suspendPersist(true);
  try {
    const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leads'").get();
    if (tbl) {
      const cols = db.prepare('PRAGMA table_info(leads)').all() as { name: string }[];
      if (!cols.some((c) => c.name === 'name')) {
        db.prepare('DROP TABLE IF EXISTS leads').run();
        db.prepare('DROP TABLE IF EXISTS imports').run();
      }
    }
    for (const s of DDL) db.prepare(s).run();
    const row = db.prepare('SELECT COUNT(*) AS n FROM leads').get() as { n: number };
    if (row.n === 0) ensureSeeded(db);
  } finally {
    db.suspendPersist(false);
    db.persist();
  }
  instance = db;
  return db;
}

export function getDb(): Db {
  if (!instance) throw new Error('db not initialized — await ensureDb() first');
  return instance;
}

/** 清库重灌（演示/录像用）：业务表与事件表全部清空 */
export function resetDb(): void {
  const db = getDb();
  db.prepare('DELETE FROM leads').run();
  db.prepare('DELETE FROM imports').run();
  db.prepare('DELETE FROM samples').run();
  db.prepare('DELETE FROM corrections').run();
  db.prepare('DELETE FROM sends_log').run();
  db.prepare('DELETE FROM audit').run();
  ensureSeeded(db);
}

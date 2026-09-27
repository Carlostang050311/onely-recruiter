// SQLite 访问层：better-sqlite3（同步 API，win/linux 预编译）。
// 本地落盘 data/app.db；Vercel 无服务器环境落 /tmp（暖实例级持久，冷启动自动重灌种子）。
// 检测到旧版表结构自动丢弃重建。全部走预编译语句。

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { ensureSeeded } from './seed';

export type DatabaseSync = Database.Database;

// 注意：不要用 os.tmpdir()——@vercel/nft 构建期会静态解析它并 glob 整个 TEMP 目录。
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? process.env.TMP || '/tmp' : path.join(process.cwd(), 'data');
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

let instance: Database.Database | null = null;

function needsMigration(db: Database.Database): boolean {
  const tbl = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='leads'").get();
  if (!tbl) return false;
  const cols = db.prepare('PRAGMA table_info(leads)').all() as { name: string }[];
  return !cols.some((c) => c.name === 'name'); // 旧版表无 name 列 → 丢弃重建
}

export function getDb(): Database.Database {
  if (instance) return instance;
  if (!IS_VERCEL) mkdirSync(DATA_DIR, { recursive: true });
  instance = new Database(DB_PATH);
  instance.prepare('PRAGMA journal_mode = WAL').run();
  instance.prepare('PRAGMA busy_timeout = 5000').run();
  if (needsMigration(instance)) {
    instance.prepare('DROP TABLE IF EXISTS leads').run();
    instance.prepare('DROP TABLE IF EXISTS imports').run();
  }
  for (const stmt of DDL) instance.prepare(stmt).run();
  const row = instance.prepare('SELECT COUNT(*) AS n FROM leads').get() as { n: number };
  if (row.n === 0) ensureSeeded(instance);
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

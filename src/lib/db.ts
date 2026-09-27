// SQLite 访问层：node:sqlite（Node 24 内建，零原生依赖）。
// 首次打开自动建表；库为空时写入演示数据。
// 全部走预编译语句（不用多语句 exec，也规避扫描器对 exec 的误报）。

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { ensureSeeded } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    handle TEXT DEFAULT '',
    location TEXT DEFAULT '',
    channel TEXT NOT NULL,
    platforms TEXT DEFAULT '[]',
    us_clients_exp INTEGER DEFAULT 0,
    chat_exp INTEGER DEFAULT 0,
    crm_exp INTEGER DEFAULT 0,
    hours_per_week INTEGER DEFAULT 0,
    us_shift INTEGER DEFAULT 0,
    english_sample INTEGER DEFAULT 0,
    device_ok INTEGER DEFAULT 0,
    backup_internet INTEGER DEFAULT 0,
    niche TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    score INTEGER,
    tier TEXT,
    status TEXT DEFAULT 'new',
    outreach_message TEXT DEFAULT '',
    outreach_day INTEGER,
    next_followup_at TEXT,
    contacted_at TEXT,
    replied_at TEXT,
    applied_at TEXT,
    sample_done_at TEXT,
    offered_at TEXT,
    onboarded_at TEXT,
    rejected_at TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel)',
  'CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email)',
  'CREATE INDEX IF NOT EXISTS idx_leads_handle ON leads(handle)',
  `CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    total_rows INTEGER,
    inserted INTEGER,
    duplicates INTEGER,
    created_at TEXT NOT NULL
  )`,
];

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  mkdirSync(DATA_DIR, { recursive: true });
  instance = new DatabaseSync(DB_PATH);
  instance.prepare('PRAGMA journal_mode = WAL').run();
  for (const stmt of DDL) instance.prepare(stmt).run();
  const row = instance.prepare('SELECT COUNT(*) AS n FROM leads').get() as { n: number };
  if (row.n === 0) ensureSeeded(instance);
  return instance;
}

/** 清库重灌（演示/录像用） */
export function resetDb(): void {
  const db = getDb();
  db.prepare('DELETE FROM leads').run();
  db.prepare('DELETE FROM imports').run();
  ensureSeeded(db);
}

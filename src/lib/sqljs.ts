// sql.js（SQLite WASM）适配层：对外暴露 prepare/run/get/all 同步接口（参数化绑定，与 better-sqlite3 同构）。
// 零原生依赖：本地 / Vercel / Netlify 同一驱动；变更语句自动 export 落盘。
import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { BindParams, Database, QueryExecResult, SqlJsStatic } from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';

let SQL: SqlJsStatic | null = null;
let initPromise: Promise<SqlJsStatic> | null = null;

export function initSql(): Promise<SqlJsStatic> {
  if (!initPromise) {
    // asm.js 构建：纯 JS、无外部 wasm 资产，serverless 宿主上最稳
    initPromise = initSqlJs().then((s: SqlJsStatic) => {
      SQL = s;
      return s;
    });
  }
  return initPromise;
}

export function sqlReady(): boolean {
  return SQL !== null;
}

function normalizeArgs(args: unknown[]): BindParams | undefined {
  if (!args.length) return undefined;
  return args.map((a) => (a === undefined ? null : a)) as BindParams;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

class Stmt {
  private applyWrite: (text: string, params?: BindParams) => Database;
  private fetchRows: (text: string, params?: BindParams) => QueryExecResult[];
  private countModified: () => number;
  private text: string;
  private onChanged: () => void;

  constructor(raw: Database, text: string, onChanged: () => void) {
    this.applyWrite = raw.run.bind(raw);
    this.fetchRows = raw.exec.bind(raw);
    this.countModified = raw.getRowsModified.bind(raw);
    this.text = text;
    this.onChanged = onChanged;
  }

  run(...args: unknown[]): RunResult {
    this.applyWrite(this.text, normalizeArgs(args));
    const changes = this.countModified();
    let last = 0;
    const r = this.fetchRows('SELECT last_insert_rowid() AS n');
    if (r.length && r[0].values.length) last = Number(r[0].values[0][0]);
    if (!/^\s*(select|pragma)\b/i.test(this.text)) this.onChanged();
    return { changes, lastInsertRowid: last };
  }

  all(...args: unknown[]): unknown[] {
    const res = this.fetchRows(this.text, normalizeArgs(args));
    if (!res.length) return [];
    const { columns, values } = res[0];
    return values.map((row) => {
      const o: Record<string, unknown> = {};
      columns.forEach((c, i) => {
        o[c] = row[i];
      });
      return o;
    });
  }

  get(...args: unknown[]): unknown {
    const rows = this.all(...args);
    return rows.length ? rows[0] : undefined;
  }
}

export class Db {
  constructor(
    private raw: Database,
    private file: string | null
  ) {}

  prepare(text: string): Stmt {
    return new Stmt(this.raw, text, () => this.persist());
  }

  /** 导出整库字节写回文件（无文件时为 no-op） */
  persist(): void {
    if (!this.file) return;
    writeFileSync(this.file, Buffer.from(this.raw.export()));
  }
}

export function createMemoryDb(): Db {
  if (!SQL) throw new Error('sql.js not initialized: await initSql() first');
  return new Db(new SQL.Database(), null);
}

export async function openDb(file: string | null): Promise<Db> {
  const sql = await initSql();
  let bytes: Uint8Array | null = null;
  if (file) {
    try {
      bytes = new Uint8Array(readFileSync(file));
    } catch {
      bytes = null;
    }
  }
  return new Db(bytes ? new sql.Database(bytes) : new sql.Database(), file);
}

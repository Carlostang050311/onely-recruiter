// 极简 CSV 解析：支持引号包裹字段、字段内逗号/换行、CRLF（Windows 导出常见）。
// 只覆盖本项目的导入需求，不追求 RFC 全兼容。

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, ''); // 去 BOM

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (ch === '\r') {
      // 忽略，\n 统一处理
    } else {
      field += ch;
    }
  }
  // 收尾（无换行结尾的最后一行）
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

export interface CsvTable {
  headers: string[];
  rows: Record<string, string>[];
}

/** 解析为对象数组；表头做 trim + 小写归一。空行跳过。 */
export function parseCsvTable(text: string): CsvTable {
  const raw = parseCsv(text);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = raw[0].map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (const r of raw.slice(1)) {
    const obj: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((h, i) => {
      const v = (r[i] ?? '').trim();
      obj[h] = v;
      if (v !== '') hasValue = true;
    });
    if (hasValue) rows.push(obj);
  }
  return { headers, rows };
}

/** 把任意输入归一成 boole：1/true/yes/y/√ → true */
export function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    return ['1', 'true', 'yes', 'y', '√', '是'].includes(v.trim().toLowerCase());
  }
  return false;
}

export function toInt(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function toEnglishScore(v: unknown): number {
  const n = toInt(v, 0);
  return Math.max(0, Math.min(25, n));
}

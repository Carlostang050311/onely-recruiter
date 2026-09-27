// 样题闭环：3 条脚本化粉丝消息的限时人设回复，规则版 rubric 机评（0-100）+ 人工修正留痕。
// 机评维度：共情与语气 30 / 人设贴合 25 / 语法与清晰 20 / 转化意识 15 / 安全红线 10。
import type { Database as DatabaseSync } from 'better-sqlite3';

export interface RubricPart {
  k: string;
  w: number;
  v: number;
  d: string;
}

const EMPATHY = ['thank', 'understand', 'feel', 'love', 'glad', 'happy', 'sorry', 'appreciate', 'miss'];
const PERSONA = ['😉', '😅', '❤', 'xx', 'haha', 'omg', 'btw', '—', '...'];
const CTA = ['link', 'subscribe', 'exclusive', 'vip', 'check out', 'dm me', 'private', 'special'];
const REDLINE = ['meet in person', 'send money', 'wire', 'my personal number', 'off platform payment', 'guarantee income'];

function words(s: string): number {
  return (s || '').trim().split(/\s+/).filter(Boolean).length;
}

export function scoreSampleAnswers(answers: string[]): { score: number; parts: RubricPart[] } {
  const text = answers.join('\n');
  const lower = text.toLowerCase();

  // 共情与语气 30：每条回复平均命中共情词
  const empHits = EMPATHY.filter((w) => lower.includes(w)).length;
  const emp = Math.min(30, empHits * 8 + (answers.every((a) => words(a) >= 15) ? 6 : 0));

  // 人设贴合 25：口语化标记（表情/省略/语气词）
  const perHits = PERSONA.filter((w) => lower.includes(w)).length;
  const per = Math.min(25, perHits * 7 + (answers.length === 3 ? 4 : 0));

  // 语法与清晰 20：长度适中、无全大写吼叫、有标点
  const lenOk = answers.every((a) => {
    const w = words(a);
    return w >= 12 && w <= 140;
  });
  const noCaps = !/[A-Z]{8,}/.test(text);
  const punct = (text.match(/[.!?]/g) || []).length >= answers.length;
  const gra = (lenOk ? 10 : 4) + (noCaps ? 5 : 0) + (punct ? 5 : 2);

  // 转化意识 15：自然推进（链接/订阅/专属内容）
  const ctaHits = CTA.filter((w) => lower.includes(w)).length;
  const cta = Math.min(15, ctaHits * 8);

  // 安全红线 10：命中红线词直接扣光
  const redHits = REDLINE.filter((w) => lower.includes(w)).length;
  const safe = redHits === 0 ? 10 : 0;

  const parts: RubricPart[] = [
    { k: '共情与语气', w: 30, v: emp, d: `共情词命中 ${empHits} 类` },
    { k: '人设贴合', w: 25, v: per, d: `口语化标记 ${perHits} 处` },
    { k: '语法与清晰', w: 20, v: gra, d: lenOk && noCaps && punct ? '长度/大小写/标点均达标' : '存在长度、吼叫或标点问题' },
    { k: '转化意识', w: 15, v: cta, d: ctaHits ? `自然推进 ${ctaHits} 处` : '未见自然推进' },
    { k: '安全红线', w: 10, v: safe, d: redHits ? `命中红线 ${redHits} 处` : '无红线命中' },
  ];
  const score = parts.reduce((s, p) => s + p.v, 0);
  return { score, parts };
}

export interface CalibrationStats {
  n: number;
  meanAbsDelta: number | null;
  within10Pct: number | null;
}

export function calibrationStats(db: DatabaseSync): CalibrationStats {
  const rows = db.prepare('SELECT machine, human FROM corrections').all() as { machine: number; human: number }[];
  if (!rows.length) return { n: 0, meanAbsDelta: null, within10Pct: null };
  const deltas = rows.map((r) => Math.abs(r.machine - r.human));
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const within = rows.filter((_, i) => deltas[i] <= 10).length / rows.length;
  return { n: rows.length, meanAbsDelta: +mean.toFixed(1), within10Pct: Math.round(within * 100) };
}

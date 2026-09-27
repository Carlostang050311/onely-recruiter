import { describe, it, expect } from 'vitest';
import DatabaseSync from 'better-sqlite3';
import { classifyIntent } from '../src/lib/classify';
import { scoreSampleAnswers, calibrationStats } from '../src/lib/sample';
import { signSession, verifySession, leadToken, checkLeadToken } from '../src/lib/auth';
import { anonymizeStale, retentionPreview } from '../src/lib/retention';
import { checkRateLimit, unsubscribeFooter } from '../src/lib/sender';
import type { Lead } from '../src/lib/types';

describe('classifyIntent', () => {
  it('拒绝信号', () => {
    expect(classifyIntent('Please stop contacting me, not interested.')).toBe('refused');
    expect(classifyIntent('退订')).toBe('refused');
  });
  it('提问信号', () => {
    expect(classifyIntent('Sounds interesting — how much is the pay per account?')).toBe('question');
  });
  it('默认感兴趣', () => {
    expect(classifyIntent('Yes! Send me the signup link please')).toBe('interested');
  });
});

describe('scoreSampleAnswers rubric', () => {
  const good = [
    'hey you, sorry your day was rough — that sounds genuinely exhausting. I am here now though, tell me everything while I finish editing tonight`s post ❤',
    'omg stop, you are the reason I check my own comments haha... btw I saved that meme for you, btw did you eat today?',
    'a private Q&A sounds fun — I have a special link for my closest fans, want me to send it? but first, ask me one question right here xx',
  ];
  const bad = ['ok', 'YES BUY NOW!!! MEET IN PERSON AND SEND MONEY TO MY PERSONAL NUMBER', 'no'];

  it('好答案高分且无红线扣分', () => {
    const r = scoreSampleAnswers(good);
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.parts[4].v).toBe(10);
  });
  it('红线答案安全项归零', () => {
    const r = scoreSampleAnswers(bad);
    expect(r.parts[4].v).toBe(0);
    expect(r.score).toBeLessThan(60);
  });
  it('五维满分 100', () => {
    expect(scoreSampleAnswers(good).parts.reduce((s, p) => s + p.w, 0)).toBe(100);
  });
});

describe('auth session 与 token', () => {
  it('签名-校验往返', async () => {
    const t = await signSession({ user: 'dev', role: 'lead', exp: Date.now() + 60_000 });
    expect(await verifySession(t)).toEqual({ user: 'dev', role: 'lead' });
  });
  it('过期与篡改失效', async () => {
    const t = await signSession({ user: 'dev', role: 'lead', exp: Date.now() - 1 });
    expect(await verifySession(t)).toBeNull();
    expect(await verifySession(t + 'x')).toBeNull();
  });
  it('lead token 稳定且可校验', async () => {
    expect(await checkLeadToken('L001', await leadToken('L001'))).toBe(true);
    expect(await checkLeadToken('L001', await leadToken('L002'))).toBe(false);
  });
});

function memDb() {
  const db = new DatabaseSync(':memory:');
  db.prepare(
    `CREATE TABLE leads (id TEXT PRIMARY KEY, name TEXT, status TEXT, created_at TEXT, email TEXT, phone TEXT, telegram TEXT, profile_url TEXT, notes TEXT, skills TEXT)`
  ).run();
  db.prepare(`CREATE TABLE sends_log (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT, channel TEXT, mode TEXT, day TEXT, ts TEXT)`).run();
  db.prepare(`CREATE TABLE corrections (id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id TEXT, machine INTEGER, human INTEGER, delta INTEGER, ts TEXT, actor TEXT)`).run();
  return db;
}

describe('retention PII 匿名化', () => {
  it('lost 超期被匿名化，其余不动', () => {
    const db = memDb();
    const old = new Date(Date.now() - 120 * 86400_000).toISOString();
    const fresh = new Date().toISOString();
    db.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,?)').run('L1', 'Old Lost', 'lost', old, 'a@b.com', '123', '@t', 'u', 'note', '[]');
    db.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,?)').run('L2', 'Fresh Lost', 'lost', fresh, 'c@d.com', '456', '@t2', 'u2', 'note2', '[]');
    db.prepare('INSERT INTO leads VALUES (?,?,?,?,?,?,?,?,?,?)').run('L3', 'Active', 'replied', old, 'e@f.com', '789', '@t3', 'u3', 'note3', '[]');
    expect(retentionPreview(db, 90)).toBe(1);
    expect(anonymizeStale(db, 90)).toBe(1);
    const l1 = db.prepare('SELECT * FROM leads WHERE id=?').get('L1') as { name: string; email: string };
    expect(l1.name).toBe('Anonymized-L1');
    expect(l1.email).toBe('');
    const l3 = db.prepare('SELECT * FROM leads WHERE id=?').get('L3') as { name: string };
    expect(l3.name).toBe('Active');
  });
});

describe('sender 限频与退订页脚', () => {
  it('限频计数与上限', () => {
    const db = memDb();
    expect(checkRateLimit(db, 'email').ok).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < 100; i++) {
      db.prepare('INSERT INTO sends_log (lead_id, channel, mode, day, ts) VALUES (?,?,?,?,?)').run('L', 'email', 'sim', today, '');
    }
    const rl = checkRateLimit(db, 'email');
    expect(rl.ok).toBe(false);
    expect(rl.used).toBe(100);
  });
  it('退订页脚含 token 链接', async () => {
    const lead = { id: 'L007', source: 'LinkedIn' } as Lead;
    const f = await unsubscribeFooter(lead, 'http://localhost:3777');
    expect(f).toContain('/api/unsubscribe?t=' + (await leadToken('L007')));
    expect(f).toContain('LinkedIn');
  });
});

describe('calibrationStats', () => {
  it('无修正返回空', () => {
    expect(calibrationStats(memDb()).n).toBe(0);
  });
  it('有修正算偏差', () => {
    const db = memDb();
    db.prepare('INSERT INTO corrections (lead_id, machine, human, delta, ts, actor) VALUES (?,?,?,?,?,?)').run('L1', 80, 90, 10, '', 'dev');
    db.prepare('INSERT INTO corrections (lead_id, machine, human, delta, ts, actor) VALUES (?,?,?,?,?,?)').run('L2', 70, 72, 2, '', 'dev');
    const s = calibrationStats(db);
    expect(s.n).toBe(2);
    expect(s.meanAbsDelta).toBe(6);
    expect(s.within10Pct).toBe(100);
  });
});

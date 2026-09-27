// GET  /api/leads/[id]/sample → 样题状态（null = 未发送）
// POST /api/leads/[id]/sample → { action:'send' } 发放样题；{ action:'correct', human_score } 人工修正留痕
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getDb } from '../../../../../lib/db';
import { getLead, saveLead, addActivity } from '../../../../../lib/store';
import { audit } from '../../../../../lib/audit';
import { todayStr } from '../../../../../lib/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = getDb().prepare('SELECT * FROM samples WHERE lead_id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ sample: null });
  return NextResponse.json({
    sample: {
      ...row,
      answers: JSON.parse(String(row.answers ?? '[]')),
      machine_parts: JSON.parse(String(row.machine_parts ?? '[]')),
    },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const lead = getLead(db, id);
  if (!lead) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const actor = req.headers.get('x-auth-user') ?? 'system';
  const body = (await req.json()) as { action?: string; human_score?: number };

  if (body.action === 'send') {
    const existing = db.prepare('SELECT token FROM samples WHERE lead_id = ?').get(id) as { token: string } | undefined;
    const token = existing?.token ?? randomBytes(12).toString('hex');
    if (existing) {
      db.prepare("UPDATE samples SET sent_at = ?, status = 'sent' WHERE lead_id = ?").run(todayStr(), id);
    } else {
      db.prepare('INSERT INTO samples (lead_id, token, sent_at, status) VALUES (?,?,?,?)').run(id, token, todayStr(), 'sent');
    }
    addActivity(lead, 'Sample task sent (3 scripted fan messages, 15 min)');
    saveLead(db, lead);
    audit(db, actor, 'sample.send', id, token.slice(0, 6) + '…');
    const base = process.env.APP_BASE || 'http://localhost:3777';
    return NextResponse.json({ token, url: `${base}/sample/${token}` });
  }

  if (body.action === 'correct') {
    const row = db.prepare('SELECT machine_score FROM samples WHERE lead_id = ?').get(id) as
      | { machine_score: number | null }
      | undefined;
    if (!row || row.machine_score == null) return NextResponse.json({ error: 'no machine score yet' }, { status: 400 });
    const human = Math.max(0, Math.min(100, Number(body.human_score) || 0));
    db.prepare('UPDATE samples SET human_score = ? WHERE lead_id = ?').run(human, id);
    db.prepare('INSERT INTO corrections (lead_id, machine, human, delta, ts, actor) VALUES (?,?,?,?,?,?)').run(
      id,
      row.machine_score,
      human,
      human - row.machine_score,
      new Date().toISOString(),
      actor
    );
    addActivity(lead, `Human correction: machine ${row.machine_score} → human ${human}`);
    saveLead(db, lead);
    audit(db, actor, 'sample.correct', id, `${row.machine_score}→${human}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}

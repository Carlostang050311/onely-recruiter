// 单一路由分发全部 /api/*（无服务器函数数量上限下的合并形态）；URL 与行为与拆分版一致。
// 认证门在此统一执行（原 middleware 职责）：公开路径除外，lead/finance 才能碰重置/批量/导出/留存。
import { NextRequest, NextResponse } from 'next/server';
import * as H from '../../../lib/api-core';
import { verifySession, COOKIE } from '../../../lib/auth';
import { ensureDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string[] }> };
const nf = () => NextResponse.json({ error: 'not found' }, { status: 404 });
const unauth = () => NextResponse.json({ error: 'unauthorized' }, { status: 401 });
const forbidden = () => NextResponse.json({ error: 'forbidden: lead/finance role required' }, { status: 403 });

const PUBLIC = new Set(['login', 'webhook', 'webhook/sample', 'unsubscribe']);
const LEAD_ONLY = new Set(['seed', 'leads/bulk', 'leads/export', 'admin/retention']);

async function gate(req: NextRequest, p: string): Promise<{ actor: string; err?: NextResponse }> {
  if (PUBLIC.has(p)) return { actor: 'system' };
  const session = await verifySession(req.cookies.get(COOKIE)?.value);
  if (!session) return { actor: 'system', err: unauth() };
  if (LEAD_ONLY.has(p) && session.role !== 'lead' && session.role !== 'finance') {
    return { actor: session.user, err: forbidden() };
  }
  return { actor: session.user };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  await ensureDb();
  const p = (await ctx.params).slug.join('/');
  const g = await gate(req, p);
  if (g.err) return g.err;
  if (p === 'leads') return H.leadsGet(req);
  if (p === 'leads/export') return H.exportGet(req);
  if (p === 'stats') return H.statsGet();
  if (p === 'audit') return H.auditGet();
  if (p === 'unsubscribe') return H.unsubscribeGet(req);
  const ms = p.match(/^leads\/([^/]+)\/sample$/);
  if (ms) return H.sampleGet(ms[1]);
  return nf();
}

export async function POST(req: NextRequest, ctx: Ctx) {
  await ensureDb();
  const p = (await ctx.params).slug.join('/');
  const g = await gate(req, p);
  if (g.err) return g.err;
  if (p === 'leads') return H.leadsPost();
  if (p === 'leads/import') return H.importPost(req, g.actor);
  if (p === 'leads/bulk') return H.bulkPost(req);
  if (p === 'seed') return H.seedPost(g.actor);
  if (p === 'login') return H.loginPost(req);
  if (p === 'webhook') return H.webhookPost(req);
  if (p === 'webhook/sample') return H.webhookSamplePost(req);
  if (p === 'admin/retention') return H.retentionPost(req, g.actor);
  const m1 = p.match(/^leads\/([^/]+)\/stage$/);
  if (m1) return H.stagePost(req, m1[1], g.actor);
  const m2 = p.match(/^leads\/([^/]+)\/message$/);
  if (m2) return H.messagePost(req, m2[1], g.actor);
  const m3 = p.match(/^leads\/([^/]+)\/sample$/);
  if (m3) return H.samplePost(req, m3[1], g.actor);
  return nf();
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  await ensureDb();
  const p = (await ctx.params).slug.join('/');
  const g = await gate(req, p);
  if (g.err) return g.err;
  const m = p.match(/^leads\/([^/]+)$/);
  if (m) return H.leadPatch(req, m[1], g.actor);
  return nf();
}

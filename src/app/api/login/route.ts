// POST /api/login  body: { user?, password } → 会话 cookie
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, signSession, COOKIE } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { user?: string; password?: string };
  const session = authenticate(body.user ?? '', body.password ?? '');
  if (!session) return NextResponse.json({ error: 'bad credentials' }, { status: 401 });
  const token = await signSession({ ...session, exp: Date.now() + 12 * 3600_000 });
  const res = NextResponse.json({ ok: true, role: session.role, user: session.user });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 12 * 3600 });
  return res;
}

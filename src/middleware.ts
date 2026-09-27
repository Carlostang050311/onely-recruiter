// 认证门：会话 cookie 校验；lead/finance 角色才能碰重置/批量/导出/管理端点。
// webhook 与退订、样题提交页对外公开（webhook 内部再校验共享密钥 / token 即密钥）。
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE } from './lib/auth';

const PUBLIC_PREFIXES = ['/login', '/api/login', '/api/unsubscribe', '/sample', '/api/webhook'];
const LEAD_ONLY_PREFIXES = ['/api/leads/export', '/api/leads/bulk', '/api/seed', '/api/admin'];

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  if (p.startsWith('/_next') || p === '/favicon.ico' || p.endsWith('.csv') || p.endsWith('.png') || p.endsWith('.ico')) {
    return NextResponse.next();
  }
  if (PUBLIC_PREFIXES.some((x) => p === x || p.startsWith(x + '/'))) {
    return NextResponse.next();
  }
  const session = await verifySession(req.cookies.get(COOKIE)?.value);
  if (!session) {
    if (p.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (LEAD_ONLY_PREFIXES.some((x) => p.startsWith(x)) && session.role !== 'lead' && session.role !== 'finance') {
    return NextResponse.json({ error: 'forbidden: lead/finance role required' }, { status: 403 });
  }
  const res = NextResponse.next();
  res.headers.set('x-auth-user', session.user);
  res.headers.set('x-auth-role', session.role);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

// 会话认证：HMAC-SHA256（Web Crypto，Edge/Node 双运行时可用）签名 cookie。
// 角色来自 USERS 环境变量（默认 dev 账号）。
import type { Role } from './roles';

const SECRET = process.env.SESSION_SECRET || 'onely-dev-secret';
export const COOKIE = 'onely_session';
export const DEV_PASS = process.env.DEV_PASS || 'onely2026';

interface User {
  id: string;
  pass: string;
  role: Role;
}

function users(): User[] {
  const raw = process.env.USERS;
  if (raw) {
    return raw
      .split(';')
      .map((s) => s.split(':'))
      .filter((p) => p.length === 3)
      .map(([id, pass, role]) => ({ id, pass, role: role as Role }));
  }
  return [
    { id: 'dev', pass: DEV_PASS, role: 'lead' },
    { id: 'ops', pass: DEV_PASS, role: 'operator' },
  ];
}

export function authenticate(id: string, pass: string): { user: string; role: Role } | null {
  const list = users();
  const u = list.find((x) => x.id === id) ?? (id ? null : list[0]);
  if (!u) return null;
  if (pass !== u.pass) return null;
  return { user: u.id, role: u.role };
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return bin;
}

async function hmacHex(data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64url(new Uint8Array(sig));
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(payload: { user: string; role: Role; exp: number }): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await hmacHex(body);
  return `${body}.${sig}`;
}

export async function verifySession(token: string | null | undefined): Promise<{ user: string; role: Role } | null> {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = await hmacHex(body);
  if (!constantTimeEq(sig, expect)) return null;
  try {
    const p = JSON.parse(fromB64url(body)) as { user: string; role: Role; exp: number };
    if (p.exp < Date.now()) return null;
    return { user: p.user, role: p.role };
  } catch {
    return null;
  }
}

/** 退订 / 样题令牌：对 lead id 的 HMAC 截断 */
export async function leadToken(leadId: string): Promise<string> {
  return (await hmacHex('unsub:' + leadId)).slice(0, 16);
}

export async function checkLeadToken(leadId: string, token: string): Promise<boolean> {
  return constantTimeEq(await leadToken(leadId), token);
}

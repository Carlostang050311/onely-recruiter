// 真实发送通道 + 合规件：
// - 邮件：Resend / Postmark（endpoint 为硬编码字面量 host，非用户输入，无 SSRF 面）
// - Telegram：原型阶段保持模拟发送；生产接线请经自有出口代理（代理侧做 host 白名单），见 README
// - 未配置凭据时回落「模拟发送」，行为与之前一致
// - 合规：邮件自动附加退订页脚；按渠道日限频（超出返回限流错误）
import type { Database as DatabaseSync } from 'better-sqlite3';
import type { Lead } from './types';
import { leadToken } from './auth';
import { todayStr } from './types';

export interface SendResult {
  mode: 'live' | 'simulated';
  provider?: string;
  error?: string;
}

export function senderMode(channel: string): { mode: 'live' | 'simulated'; provider?: string } {
  if (channel === 'email') {
    const p = process.env.EMAIL_PROVIDER;
    const key = process.env.EMAIL_API_KEY;
    if ((p === 'resend' || p === 'postmark') && key && process.env.EMAIL_FROM) return { mode: 'live', provider: p };
  }
  return { mode: 'simulated' };
}

export async function unsubscribeFooter(lead: Lead, base: string): Promise<string> {
  return `\n\n---\nYou're receiving this because your public profile matched Onely's operator program (${lead.source}).\nUnsubscribe: ${base}/api/unsubscribe?t=${await leadToken(lead.id)}`;
}

/** 日限频：每渠道每天 SEND_CAP（默认 100）条 */
export function checkRateLimit(db: DatabaseSync, channel: string): { ok: boolean; used: number; cap: number } {
  const cap = Number(process.env.SEND_CAP ?? 100);
  const day = todayStr();
  const row = db.prepare('SELECT COUNT(*) AS n FROM sends_log WHERE channel = ? AND day = ?').get(channel, day) as {
    n: number;
  };
  return { ok: row.n < cap, used: row.n, cap };
}

export function logSend(db: DatabaseSync, leadId: string, channel: string, mode: string): void {
  db.prepare('INSERT INTO sends_log (lead_id, channel, mode, day, ts) VALUES (?,?,?,?,?)').run(
    leadId,
    channel,
    mode,
    todayStr(),
    new Date().toISOString()
  );
}

export async function sendOutreach(
  db: DatabaseSync,
  lead: Lead,
  channel: string,
  subject: string,
  body: string,
  base: string
): Promise<SendResult> {
  const { mode, provider } = senderMode(channel);
  if (mode === 'simulated') return { mode };

  const finalBody = body + (await unsubscribeFooter(lead, base));

  try {
    if (provider === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.EMAIL_API_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to: [lead.email],
          subject: subject || 'Onely operator program',
          text: finalBody,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { mode: 'simulated', error: `resend ${res.status}` };
      logSend(db, lead.id, channel, 'live');
      return { mode: 'live', provider };
    }
    if (provider === 'postmark') {
      const res = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'x-postmark-server-token': process.env.EMAIL_API_KEY as string,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          From: process.env.EMAIL_FROM,
          To: lead.email,
          Subject: subject || 'Onely operator program',
          TextBody: finalBody,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return { mode: 'simulated', error: `postmark ${res.status}` };
      logSend(db, lead.id, channel, 'live');
      return { mode: 'live', provider };
    }
  } catch (e) {
    return { mode: 'simulated', error: String(e).slice(0, 120) };
  }
  return { mode: 'simulated' };
}

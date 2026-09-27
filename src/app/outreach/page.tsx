'use client';
import { useCallback, useEffect, useState } from 'react';
import { CHANNELS, STATUS_LABELS, channelLabel } from '../../lib/types';
import type { LeadRow, Status } from '../../lib/types';
import { DAY_LABELS } from '../../lib/copy';
import type { FollowupDay } from '../../lib/copy';

interface Msg {
  id: number;
  name: string;
  tier: string | null;
  channel: string;
  subject?: string;
  body: string;
  mode: 'tpl' | 'ai';
  status?: Status;
}

interface AiCfg {
  enabled: boolean;
  base: string;
  key: string;
  model: string;
}

const AI_CFG_KEY = 'onely.aiCfg';

export default function OutreachPage() {
  const [status, setStatus] = useState<Status>('new');
  const [channel, setChannel] = useState('');
  const [day, setDay] = useState<FollowupDay>(0);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [aiCfg, setAiCfg] = useState<AiCfg>({ enabled: false, base: '', key: '', model: 'gpt-4o-mini' });

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  };

  const loadLeads = useCallback(() => {
    const sp = new URLSearchParams({ status, sort: 'score' });
    if (channel) sp.set('channel', channel);
    fetch(`/api/leads?${sp}`)
      .then((r) => r.json())
      .then((d) => setLeads(d.leads as LeadRow[]));
  }, [status, channel]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AI_CFG_KEY);
      if (saved) setAiCfg(JSON.parse(saved) as AiCfg);
    } catch {
      /* ignore */
    }
  }, []);

  function saveAiCfg(next: AiCfg) {
    setAiCfg(next);
    localStorage.setItem(AI_CFG_KEY, JSON.stringify(next));
  }

  async function polishOne(m: Msg, cfg: AiCfg): Promise<string | null> {
    const base = cfg.base.replace(/\/+$/, '');
    const url = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: `Rewrite this recruiter outreach message to feel more personal and natural, without inventing facts. Keep under 120 words. Return ONLY the rewritten message body.\n\n${m.subject ? `Subject: ${m.subject}\n\n` : ''}${m.body}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  async function generate() {
    if (!leads.length) {
      showToast('当前筛选没有线索');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: leads.map((l) => l.id), day }),
      });
      const data = (await res.json()) as {
        messages: { id: number; name: string; tier: string | null; channel: string; subject?: string; body: string }[];
      };
      const base: Msg[] = data.messages.map((m) => ({ ...m, mode: 'tpl' as const }));
      setMsgs(base);

      if (aiCfg.enabled && aiCfg.base && aiCfg.key) {
        showToast('正在用 AI 润色…');
        let ok = 0;
        for (let i = 0; i < base.length; i++) {
          try {
            const polished = await polishOne(base[i], aiCfg);
            if (polished) {
              base[i] = { ...base[i], body: polished, mode: 'ai' };
              ok += 1;
            }
          } catch {
            /* 单条失败保留模板 */
          }
          setMsgs([...base]);
        }
        showToast(ok ? `AI 润色完成 ${ok}/${base.length} 条` : 'AI 不可用，已全部保留模板文案');
      } else {
        showToast(`已生成 ${base.length} 条个性化文案（${DAY_LABELS[day]}）`);
      }
    } finally {
      setBusy(false);
    }
  }

  async function markContacted(ids: number[]) {
    for (const id of ids) {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'contacted' }),
      });
    }
    setMsgs((prev) => prev.map((m) => (ids.includes(m.id) ? { ...m, status: 'contacted' } : m)));
    showToast(`已标记 ${ids.length} 条为「已触达」，D1 提醒已排期`);
  }

  async function copyText(m: Msg) {
    const text = m.subject ? `Subject: ${m.subject}\n\n${m.body}` : m.body;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`已复制给 ${m.name} 的文案`);
    } catch {
      showToast('复制失败，请手动选择文本');
    }
  }

  return (
    <>
      <div className="page-head">
        <h2>触达文案</h2>
        <p>渠道模板 × 线索变量批量个性化；D0 首触 / D1 提醒 / D2 最后召集。可选 AI 润色（浏览器直连，Key 不出本机）</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <label className="field">
            目标人群（状态）
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {(Object.keys(STATUS_LABELS) as Status[])
                .filter((s) => s !== 'onboarded' && s !== 'rejected')
                .map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
            </select>
          </label>
          <label className="field">
            渠道
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">全部渠道</option>
              {CHANNELS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            触达轮次
            <select value={day} onChange={(e) => setDay(Number(e.target.value) as FollowupDay)}>
              {([0, 1, 2] as FollowupDay[]).map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </label>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn primary" onClick={generate} disabled={busy}>
              {busy ? '生成中…' : `生成 ${leads.length} 条文案`}
            </button>
          </div>
          {msgs.length > 0 && (
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                className="btn"
                onClick={() => markContacted(msgs.filter((m) => m.status !== 'contacted').map((m) => m.id))}
              >
                全部标记已触达
              </button>
            </div>
          )}
        </div>

        <details style={{ marginTop: 14 }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>
            AI 润色设置（可选，浏览器直连 OpenAI 兼容接口，Key 仅存本机 localStorage）
          </summary>
          <div className="row" style={{ marginTop: 10 }}>
            <label className="field" style={{ flex: 2 }}>
              Base URL
              <input
                placeholder="https://your-relay.example.com/v1"
                value={aiCfg.base}
                onChange={(e) => saveAiCfg({ ...aiCfg, base: e.target.value })}
              />
            </label>
            <label className="field" style={{ flex: 2 }}>
              API Key
              <input
                type="password"
                placeholder="sk-..."
                value={aiCfg.key}
                onChange={(e) => saveAiCfg({ ...aiCfg, key: e.target.value })}
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              模型
              <input
                placeholder="gpt-4o-mini"
                value={aiCfg.model}
                onChange={(e) => saveAiCfg({ ...aiCfg, model: e.target.value })}
              />
            </label>
            <label className="row" style={{ alignSelf: 'flex-end', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aiCfg.enabled}
                onChange={(e) => saveAiCfg({ ...aiCfg, enabled: e.target.checked })}
              />
              启用
            </label>
          </div>
        </details>
      </div>

      {msgs.length > 0 && (
        <div className="msg-grid">
          {msgs.map((m) => (
            <div className="msg-card" key={m.id}>
              <div className="head">
                <div className="row" style={{ gap: 8 }}>
                  <b>{m.name}</b>
                  <span className={`chip tier-${m.tier ?? 'C'}`}>{m.tier}</span>
                  <span className="chip status">{channelLabel(m.channel)}</span>
                </div>
                <span className={`mode-badge ${m.mode === 'ai' ? 'ai' : 'tpl'}`}>{m.mode === 'ai' ? 'AI 润色' : '模板'}</span>
              </div>
              {m.subject && <div className="subject">主题：{m.subject}</div>}
              <pre>{m.body}</pre>
              <div className="acts">
                <button className="btn sm" onClick={() => copyText(m)}>复制</button>
                {m.status === 'contacted' ? (
                  <span className="chip tier-A">已标记触达</span>
                ) : (
                  <button className="btn sm primary" onClick={() => markContacted([m.id])}>
                    标记已触达
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

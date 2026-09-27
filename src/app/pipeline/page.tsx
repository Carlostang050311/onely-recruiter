'use client';
import { useCallback, useEffect, useState } from 'react';
import { STATUS_FLOW, STATUS_LABELS, channelLabel } from '../../lib/types';
import type { LeadRow, Status } from '../../lib/types';

function dueInfo(lead: LeadRow, now: number): { cls: string; text: string } | null {
  if (!lead.next_followup_at) return null;
  const t = new Date(lead.next_followup_at).getTime();
  if (t <= now) return { cls: 'due', text: '逾期待跟进' };
  if (t - now < 6 * 3600_000) return { cls: 'soon', text: '今日跟进' };
  return null;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [toast, setToast] = useState('');
  const now = Date.now();

  const load = useCallback(() => {
    fetch('/api/leads?sort=followup')
      .then((r) => r.json())
      .then((d) => setLeads(d.leads as LeadRow[]));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function move(lead: LeadRow, status: Status) {
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setToast(`${lead.first_name} → ${STATUS_LABELS[status]}`);
    setTimeout(() => setToast(''), 1800);
    load();
  }

  return (
    <>
      <div className="page-head">
        <h2>跟进看板</h2>
        <p>按状态分列；逾期跟进卡片会标红。人工只做两个动作：推进状态、处理逾期</p>
      </div>

      <div className="kanban">
        {STATUS_FLOW.map((s) => {
          const col = leads.filter((l) => l.status === s);
          return (
            <div className="kcol" key={s}>
              <div className="kcol-head">
                <span>{STATUS_LABELS[s]}</span>
                <span className="count">{col.length}</span>
              </div>
              {col.map((l) => {
                const due = dueInfo(l, now);
                const idx = STATUS_FLOW.indexOf(s);
                const prev = idx > 0 ? STATUS_FLOW[idx - 1] : null;
                const next = idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
                return (
                  <div
                    className="kcard"
                    key={l.id}
                    style={due?.cls === 'due' ? { borderColor: 'rgba(255,107,107,0.5)' } : undefined}
                  >
                    <div className="name">
                      <span>{l.first_name} {l.last_name}</span>
                      <span className={`chip tier-${l.tier ?? 'C'}`}>{l.tier}</span>
                    </div>
                    <div className="meta">
                      {channelLabel(l.channel)} · {l.score ?? '—'} 分 · {l.location}
                    </div>
                    {due && (
                      <div style={{ marginTop: 6 }}>
                        <span className={`chip ${due.cls}`}>{due.text}</span>
                      </div>
                    )}
                    <div className="acts">
                      {prev && s !== 'new' && (
                        <button className="btn sm ghost" onClick={() => move(l, prev)}>←</button>
                      )}
                      {next && (
                        <button className="btn sm" onClick={() => move(l, next)}>→ {STATUS_LABELS[next]}</button>
                      )}
                      {s !== 'onboarded' && (
                        <button className="btn sm danger-ghost" onClick={() => move(l, 'rejected')}>✕</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

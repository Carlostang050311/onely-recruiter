'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { STATUS_FLOW, STATUS_LABELS, channelLabel } from '../../lib/types';
import type { LeadRow, Status } from '../../lib/types';
import Toast from '../../components/Toast';
import { Skeleton } from '../../components/motion';

function dueInfo(lead: LeadRow, now: number): { cls: string; text: string } | null {
  if (!lead.next_followup_at) return null;
  const t = new Date(lead.next_followup_at).getTime();
  if (t <= now) return { cls: 'due', text: '逾期待跟进' };
  if (t - now < 6 * 3600_000) return { cls: 'soon', text: '今日跟进' };
  return null;
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const now = Date.now();

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/leads?sort=followup')
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads as LeadRow[]);
        setLoading(false);
      });
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
        {STATUS_FLOW.map((s, ci) => {
          const col = leads.filter((l) => l.status === s);
          return (
            <motion.div layout className="kcol" key={s}>
              <div className="kcol-head">
                <span>{STATUS_LABELS[s]}</span>
                <span className="count">{col.length}</span>
              </div>
              {loading && leads.length === 0
                ? [...Array(3)].map((_, i) => <Skeleton key={i} h={92} style={{ marginBottom: 8 }} />)
                : col.map((l, i) => {
                    const due = dueInfo(l, now);
                    const idx = STATUS_FLOW.indexOf(s);
                    const prev = idx > 0 ? STATUS_FLOW[idx - 1] : null;
                    const next = idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
                    return (
                      <motion.div
                        layout
                        layoutId={`lead-${l.id}`}
                        className="kcard"
                        key={l.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          layout: { type: 'spring', stiffness: 420, damping: 34 },
                          opacity: { duration: 0.22, delay: ci * 0.04 + i * 0.03 },
                          y: { duration: 0.22, delay: ci * 0.04 + i * 0.03 },
                        }}
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
                            <motion.span
                              className={`chip ${due.cls}`}
                              initial={{ scale: 1 }}
                              animate={{ scale: [1, 1.15, 1, 1.1, 1] }}
                              transition={{ duration: 0.6, times: [0, 0.3, 0.55, 0.8, 1], delay: 0.4 }}
                            >
                              {due.text}
                            </motion.span>
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
                      </motion.div>
                    );
                  })}
            </motion.div>
          );
        })}
      </div>

      <Toast msg={toast} />
    </>
  );
}

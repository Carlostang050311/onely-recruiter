'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Lead, Status } from '../../lib/types';
import { STAGE_KEYS, STATUSES, countryByCode, daysBetween, fmtDate, todayStr, PLATFORM_LABEL } from '../../lib/types';
import Drawer from '../../components/Drawer';
import Toast from '../../components/Toast';
import { Skeleton } from '../../components/motion';

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [simLead, setSimLead] = useState('');
  const today = todayStr();
  const isStatic = process.env.NEXT_PUBLIC_STATIC === '1';

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/leads')
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads as Lead[]);
        setLoading(false);
      });
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function move(id: string, dir: 1 | -1) {
    await fetch(`/api/leads/${id}/stage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dir }),
    });
    load();
  }

  async function dropTo(id: string, status: Status) {
    await fetch(`/api/leads/${id}/stage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function completeFollowup(l: Lead) {
    const seq = Math.min(l.messages.length, 2);
    const channel = l.messages.length ? l.messages[l.messages.length - 1].channel : 'email';
    await fetch(`/api/leads/${l.id}/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel, seq }),
    });
    load();
    setToast('已记录跟进：' + l.name);
  }

  async function fireWebhook(type: string, extra: Record<string, unknown> = {}) {
    const lead = leads.find((l) => l.id === simLead) ?? leads.find((l) => l.status === 'contacted');
    if (!lead) return;
    await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-key': 'onely-hook' },
      body: JSON.stringify({ type, email: lead.email, ...extra }),
    });
    load();
    setToast(`事件已模拟：${type} → ${lead.name}`);
  }

  const reminders = leads.filter(
    (l) => l.next_followup_at && l.next_followup_at <= today && ['contacted', 'replied', 'qualified'].includes(l.status)
  );
  const drawerLead = leads.find((l) => l.id === drawerId) ?? null;

  return (
    <>
      {isStatic && (
        <div className="card section-gap">
          <div className="card-title">
            事件模拟器 <span className="sub">静态演示版：替代生产环境的表单/邮件/电子签 webhook</span>
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <select className="field" style={{ minWidth: 220 }} value={simLead} onChange={(e) => setSimLead(e.target.value)}>
              <option value="">选择线索（默认首个已触达）</option>
              {leads.slice(0, 40).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.tier} · {l.name}（{l.status}）
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={() => fireWebhook('reply', { text: 'Yes! Send me the signup link please' })}>模拟回复·感兴趣</button>
            <button className="btn btn-sm" onClick={() => fireWebhook('reply', { text: 'How does the payout work?' })}>模拟回复·提问</button>
            <button className="btn btn-sm" onClick={() => fireWebhook('reply', { text: 'Not interested, please stop.' })}>模拟回复·拒绝</button>
            <button className="btn btn-sm" onClick={() => fireWebhook('form', { quiz_score: 5 })}>模拟筛选表 5 分</button>
            <button className="btn btn-sm" onClick={() => fireWebhook('sign')}>模拟电子签完成</button>
          </div>
        </div>
      )}
      <h3 className="mt8" style={{ marginBottom: 10, fontSize: 14.5 }}>
        待跟进提醒 <span className="small muted">（逾期 / 今日到期）</span>
      </h3>
      <div className="reminders">
        {reminders.length === 0 && <div className="small muted">暂无到期提醒，节奏健康。</div>}
        {reminders.slice(0, 12).map((l) => {
          const overdue = (l.next_followup_at ?? '') < today;
          return (
            <motion.div
              key={l.id}
              className={`rem-item${overdue ? ' overdue' : ''}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              style={{ cursor: 'pointer' }}
              onClick={() => setDrawerId(l.id)}
            >
              <span className={`tier-badge tier-${l.tier}`}>{l.tier}</span>
              <div>
                <div className="rname">{l.name}</div>
                <div className="rmeta">
                  {overdue ? `逾期 ${Math.abs(daysBetween(l.next_followup_at!, today))} 天` : '今日到期'} ·{' '}
                  {STATUSES.find((s) => s.key === l.status)?.label}
                </div>
              </div>
              <button
                className="btn btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  completeFollowup(l);
                }}
              >
                完成跟进
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="kanban">
        {STAGE_KEYS.map((k) => {
          const st = STATUSES.find((s) => s.key === k)!;
          const list = leads.filter((l) => l.status === k);
          return (
            <div
              className="kcol"
              key={k}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) dropTo(id, k);
              }}
            >
              <div className="kcol-head">
                <span className="dot" style={{ background: st.color }} />
                {st.label}
                <span className="cnt">{list.length}</span>
              </div>
              {loading && leads.length === 0
                ? [...Array(3)].map((_, i) => <Skeleton key={i} h={84} style={{ marginBottom: 9 }} />)
                : list.map((l) => (
                    <motion.div
                      layout
                      layoutId={`lead-${l.id}`}
                      className="kcard"
                      key={l.id}
                      draggable
                      onDragStart={(e) => (e as unknown as React.DragEvent).dataTransfer?.setData('text/plain', l.id)}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
                        setDrawerId(l.id);
                      }}
                      transition={{ layout: { type: 'spring', stiffness: 420, damping: 34 } }}
                    >
                      <div className="kn">
                        <span className={`tier-badge tier-${l.tier}`} style={{ width: 19, height: 19, fontSize: 10.5 }}>
                          {l.tier}
                        </span>
                        {l.name}
                      </div>
                      <div className="km">
                        <span>{countryByCode(l.country).flag}</span>
                        <span>{l.platforms[0] ? PLATFORM_LABEL[l.platforms[0]] : ''}</span>
                        {l.next_followup_at && <span style={{ color: 'var(--gold)' }}>跟进 {fmtDate(l.next_followup_at)}</span>}
                      </div>
                      <div className="kacts">
                        <button
                          onClick={() => move(l.id, -1)}
                          disabled={k === 'new'}
                          style={k === 'new' ? { opacity: 0.35 } : undefined}
                        >
                          ←
                        </button>
                        <button onClick={() => move(l.id, 1)} disabled={k === 'onboarded'} style={k === 'onboarded' ? { opacity: 0.35 } : undefined}>
                          推进 →
                        </button>
                      </div>
                    </motion.div>
                  ))}
            </div>
          );
        })}
        {/* 流失列：参照稿看板为五阶段 + 流失收纳，保留第六列展示 lost */}
        <div
          className="kcol"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (id) dropTo(id, 'lost');
          }}
        >
          <div className="kcol-head">
            <span className="dot" style={{ background: '#87726c' }} />
            流失
            <span className="cnt">{leads.filter((l) => l.status === 'lost').length}</span>
          </div>
          {leads
            .filter((l) => l.status === 'lost')
            .map((l) => (
              <motion.div layout layoutId={`lead-${l.id}`} className="kcard" key={l.id} onClick={() => setDrawerId(l.id)}>
                <div className="kn">
                  <span className={`tier-badge tier-${l.tier}`} style={{ width: 19, height: 19, fontSize: 10.5 }}>
                    {l.tier}
                  </span>
                  {l.name}
                </div>
                <div className="km">
                  <span>{countryByCode(l.country).flag}</span>
                  <span>{l.source}</span>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      <Drawer lead={drawerLead} onClose={() => setDrawerId(null)} onChanged={load} />
      <Toast msg={toast} />
    </>
  );
}

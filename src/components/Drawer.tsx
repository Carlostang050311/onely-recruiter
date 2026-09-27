'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead } from '../lib/types';
import { ALL_PLATFORMS, CHANNELS, COUNTRIES, PLATFORM_LABEL, SOURCES, countryByCode, fmtDate } from '../lib/types';
import { scoreParts } from '../lib/scoring';
import { buildMessage } from '../lib/copy';
import { Icon } from './Icons';

type TabKey = 'score' | 'msg' | 'log' | 'edit';

const EN_LABEL: Record<string, string> = { native: '母语级', fluent: '流利', conversational: '日常交流' };
const CLIENT_LABEL: Record<string, string> = { us_creator: '美国创作者', eu_creator: '欧洲创作者', agency: '代理机构' };

export default function Drawer({
  lead,
  initialTab = 'score',
  onClose,
  onChanged,
}: {
  lead: Lead | null;
  initialTab?: TabKey;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [channel, setChannel] = useState('email');
  const [msg, setMsg] = useState<{ subject: string; body: string } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (lead) {
      setTab(initialTab);
      setForm({
        name: lead.name,
        country: lead.country,
        source: SOURCES.includes(lead.source) ? lead.source : SOURCES[0],
        english: lead.english,
        us_years: String(lead.us_years),
        rating: String(lead.rating || ''),
        hours: String(lead.hours_per_week),
        tz: String(lead.timezone_overlap),
        platforms: lead.platforms.join(','),
        notes: lead.notes || '',
      });
    }
  }, [lead, initialTab]);

  useEffect(() => {
    if (lead && tab === 'msg') setMsg(buildMessage(lead, channel));
  }, [lead, tab, channel]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  async function patch(body: Record<string, unknown>) {
    if (!lead) return null;
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { lead: Lead };
    onChanged();
    return data.lead;
  }

  async function moveStage(dir: 1 | -1) {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/stage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dir }),
    });
    onChanged();
    setToast('阶段已更新');
  }

  async function send() {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel, seq: 0 }),
    });
    onChanged();
    setToast('已模拟发送并排定 D+2 跟进');
  }

  async function saveEdit() {
    if (!lead) return;
    await patch({
      name: form.name,
      country: form.country,
      source: form.source,
      english: form.english,
      us_years: Number(form.us_years) || 0,
      rating: Number(form.rating) || 0,
      hours_per_week: Number(form.hours) || 0,
      timezone_overlap: Number(form.tz) || 0,
      platforms: form.platforms,
      notes: form.notes,
    });
    setToast('已保存并重新评分');
  }

  const c = lead ? countryByCode(lead.country) : null;

  return (
    <>
      <div className={`overlay${lead ? ' show' : ''}`} onClick={onClose} />
      <aside className={`drawer${lead ? ' show' : ''}`}>
        {lead && (
          <>
            <div className="drawer-head">
              <button className="icon-close" onClick={onClose}>
                <Icon name="close" size={18} />
              </button>
              <h3>
                <span>{lead.name}</span>
                <span className={`tier-badge tier-${lead.tier}`}>{lead.tier}</span>
              </h3>
              <div className="small muted mt8">
                {c?.flag} {c?.name} · {lead.city} · {lead.source} · {lead.role || '—'}
              </div>
            </div>
            <div className="drawer-body">
              <div className="tabs">
                {(['score', 'msg', 'log', 'edit'] as TabKey[]).map((t) => (
                  <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                    {t === 'score' ? '评分与资料' : t === 'msg' ? '触达文案' : t === 'log' ? '跟进动态' : '编辑'}
                  </button>
                ))}
              </div>

              {tab === 'score' && (
                <div>
                  <div className="card-title">
                    评分明细 <span className="sub num">{lead.score} 分 · {lead.tier} 级</span>
                  </div>
                  {scoreParts(lead).map((p, i) => (
                    <motion.div
                      className="score-row"
                      key={p.k}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                    >
                      <span className="lab">{p.k}</span>
                      <span className="bar">
                        <i style={{ width: `${(p.v / p.w) * 100}%` }} />
                      </span>
                      <span className="val num">{p.v}/{p.w}</span>
                    </motion.div>
                  ))}
                  <div className="small muted mt8">依据：{scoreParts(lead).map((p) => p.d).join(' · ')}</div>
                  <div className="card-title mt16">资料</div>
                  <div className="info-grid">
                    {[
                      ['邮箱', lead.email || '—'],
                      ['电话 / WhatsApp', lead.phone || '—'],
                      ['Telegram', lead.telegram || '—'],
                      ['主页链接', lead.profile_url ? lead.profile_url : '—'],
                      ['擅长平台', lead.platforms.map((p) => PLATFORM_LABEL[p] || p).join('、') || '—'],
                      ['技能', lead.skills.join('、') || '—'],
                      ['英语', EN_LABEL[lead.english] ?? lead.english],
                      ['AI 工具', lead.ai_tools ? '熟练' : '未声明'],
                      ['平台评分', lead.rating ? lead.rating + ' 分' : '无记录'],
                      ['每周工时', lead.hours_per_week + ' 小时'],
                      ['时区重叠', lead.timezone_overlap + ' 小时'],
                      ['客户类型', CLIENT_LABEL[lead.client_type] ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div className="k">{k}</div>
                        <div className="v" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt16">
                    <div className="flab">备注</div>
                    <div className="small muted">{lead.notes || '—'}</div>
                  </div>
                </div>
              )}

              {tab === 'msg' && (
                <div>
                  <div className="toolbar" style={{ marginBottom: 10 }}>
                    <select className="field" value={channel} onChange={(e) => setChannel(e.target.value)}>
                      {CHANNELS.map((ch) => (
                        <option key={ch.key} value={ch.key}>{ch.label}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm" onClick={() => setMsg(buildMessage(lead, channel))}>生成文案</button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText((msg?.subject ? msg.subject + '\n\n' : '') + (msg?.body ?? ''));
                        setToast('文案已复制');
                      }}
                    >
                      复制
                    </button>
                    <div style={{ flex: 1 }} />
                    <button className="btn btn-sm btn-primary" onClick={send}>模拟发送</button>
                  </div>
                  <div className="msg-box">
                    {msg?.subject && <div className="msg-subject">{msg.subject}</div>}
                    {msg?.body}
                  </div>
                </div>
              )}

              {tab === 'log' && (
                <div>
                  {lead.activities.length === 0 ? (
                    <div className="muted small">暂无动态</div>
                  ) : (
                    lead.activities.map((a, i) => (
                      <div className="activity" key={i}>
                        <span className="adot" />
                        <div className="at num">{fmtDate(a.t)}</div>
                        <div className="atext">{a.text}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'edit' && (
                <div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label className="flab">姓名</label><input className="field" style={{ width: '100%' }} value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div>
                      <label className="flab">国家/地区</label>
                      <select className="field" style={{ width: '100%' }} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                        {COUNTRIES.map((cc) => (
                          <option key={cc.code} value={cc.code}>{cc.flag}{cc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flab">来源</label>
                      <select className="field" style={{ width: '100%' }} value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                        {SOURCES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flab">英语水平</label>
                      <select className="field" style={{ width: '100%' }} value={form.english} onChange={(e) => setForm({ ...form, english: e.target.value })}>
                        <option value="native">母语级</option>
                        <option value="fluent">流利</option>
                        <option value="conversational">日常交流</option>
                      </select>
                    </div>
                    <div><label className="flab">美国市场经验（年）</label><input type="number" className="field" style={{ width: '100%' }} value={form.us_years ?? ''} onChange={(e) => setForm({ ...form, us_years: e.target.value })} /></div>
                    <div><label className="flab">平台评分/好评率</label><input type="number" className="field" style={{ width: '100%' }} value={form.rating ?? ''} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
                    <div><label className="flab">每周可投入小时</label><input type="number" className="field" style={{ width: '100%' }} value={form.hours ?? ''} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
                    <div><label className="flab">与美国时区重叠（小时）</label><input type="number" className="field" style={{ width: '100%' }} value={form.tz ?? ''} onChange={(e) => setForm({ ...form, tz: e.target.value })} /></div>
                    <div style={{ gridColumn: '1/3' }}>
                      <label className="flab">擅长平台（逗号分隔：{ALL_PLATFORMS.join(',')}）</label>
                      <input className="field" style={{ width: '100%' }} value={form.platforms ?? ''} onChange={(e) => setForm({ ...form, platforms: e.target.value })} />
                    </div>
                    <div style={{ gridColumn: '1/3' }}>
                      <label className="flab">备注</label>
                      <textarea className="field" rows={3} style={{ width: '100%' }} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                  </div>
                  <button className="btn btn-primary mt16" onClick={saveEdit}>保存更改</button>
                </div>
              )}
            </div>
            <div className="drawer-foot">
              <button className="btn btn-sm" onClick={() => moveStage(-1)}>上一阶段</button>
              <button className="btn btn-sm btn-primary" onClick={() => moveStage(1)}>推进下一阶段</button>
            </div>
          </>
        )}
      </aside>
      <AnimatePresence>
        {toast && (
          <div className="toast-wrap">
            <motion.div className="toast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="tdot" />
              {toast}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CHANNELS, STATUS_FLOW, STATUS_LABELS, channelLabel } from '../../lib/types';
import type { LeadRow, Status } from '../../lib/types';
import { scoreLead, safeParsePlatforms } from '../../lib/scoring';
import type { DedupReportItem } from '../../lib/dedup';
import Toast from '../../components/Toast';
import { Skeleton } from '../../components/motion';

interface ImportReport {
  totalRows: number;
  parsedRows: number;
  inserted: number;
  duplicates: DedupReportItem[];
  insertedLeads: { id: number; name: string; score: number | null; tier: string | null }[];
}

function nextStatus(s: Status): Status | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [filters, setFilters] = useState({ status: '', channel: '', tier: '', q: '', sort: 'score' });
  const [report, setReport] = useState<ImportReport | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [lastInserted, setLastInserted] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
    setLoading(true);
    fetch(`/api/leads?${sp}`)
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads as LeadRow[]);
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  async function doImport(csv: string, filename: string) {
    setBusy(true);
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ csv, filename }),
      });
      const data = (await res.json()) as ImportReport;
      setReport(data);
      setLastInserted(data.insertedLeads.map((l) => l.id));
      load();
      showToast(`导入完成：新增 ${data.inserted} 条，重复 ${data.duplicates.length} 条`);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    await doImport(await f.text(), f.name);
    e.target.value = '';
  }

  async function move(lead: LeadRow, status: Status) {
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <>
      <div className="page-head">
        <h2>线索与导入</h2>
        <p>CSV 导入自动去重（邮箱 / 社媒号 / 姓名+地区 三级匹配），入库即评分分级</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>导入线索</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: 'none' }} />
          <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? '导入中…' : '选择 CSV 文件'}
          </button>
          <a className="btn ghost" href="/sample-leads.csv" download>
            下载示例 CSV
          </a>
          <button
            className="btn ghost"
            onClick={async () => {
              await fetch('/api/seed', { method: 'POST' });
              setReport(null);
              load();
              showToast('演示数据已重置');
            }}
          >
            重置演示数据
          </button>
        </div>
        <label className="field">
          或直接粘贴 CSV 内容
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={'first_name,last_name,email,handle,location,channel,platforms,...\nKyla,Santos,kyla@gmail.com,@kyla,Quezon City\\, PH,telegram_community,instagram;tiktok,...'}
          />
        </label>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" disabled={!paste.trim() || busy} onClick={() => doImport(paste, 'paste.csv')}>
            导入粘贴内容
          </button>
          {paste.trim() && (
            <button className="btn ghost sm" onClick={() => setPaste('')}>
              清空
            </button>
          )}
        </div>

        {report && (
          <motion.div
            className="report"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <div className="nums">
              <div>
                <b>{report.totalRows}</b>
                <span>文件总行数</span>
              </div>
              <div>
                <b style={{ color: 'var(--ok)' }}>{report.inserted}</b>
                <span>新增入库</span>
              </div>
              <div>
                <b style={{ color: 'var(--warn)' }}>{report.duplicates.length}</b>
                <span>重复拦截</span>
              </div>
            </div>
            {report.duplicates.length > 0 && (
              <table style={{ marginBottom: 10 }}>
                <thead>
                  <tr>
                    <th>文件行</th>
                    <th>姓名</th>
                    <th>命中规则</th>
                    <th>匹配值</th>
                    <th>撞车对象</th>
                  </tr>
                </thead>
                <tbody>
                  {report.duplicates.map((d, i) => (
                    <motion.tr
                      key={i}
                      animate={{ x: [0, -6, 6, -4, 4, 0] }}
                      transition={{ duration: 0.45, delay: 0.35 + i * 0.1 }}
                    >
                      <td>{d.row}</td>
                      <td>{d.name}</td>
                      <td>
                        {d.matchedKey === 'email' ? '邮箱一致' : d.matchedKey === 'handle' ? '社媒号一致' : '姓名+地区一致'}
                      </td>
                      <td className="sub">{d.matchedValue}</td>
                      <td className="sub">{d.against.startsWith('db:') ? `库内 #${d.against.slice(3)}` : `文件第 ${d.against.slice(5)} 行`}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
            {report.insertedLeads.length > 0 && (
              <div className="small muted">
                新增并自动评分：
                {report.insertedLeads.map((l) => (
                  <span key={l.id} className="chip" style={{ marginLeft: 6 }}>
                    {l.name} <b style={{ marginLeft: 4 }}>{l.score}</b>
                    <span className={`chip tier-${l.tier}`} style={{ marginLeft: 4 }}>{l.tier}</span>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>线索列表（{leads.length}）</h3>
          <div className="row">
            <input
              placeholder="搜索姓名 / 邮箱 / 社媒号"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              style={{ width: 190 }}
            />
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">全部状态</option>
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}>
              <option value="">全部渠道</option>
              {CHANNELS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
            <select value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })}>
              <option value="">全部级别</option>
              <option value="A">A 级</option>
              <option value="B">B 级</option>
              <option value="C">C 级</option>
            </select>
            <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
              <option value="score">按评分</option>
              <option value="created">按导入时间</option>
              <option value="followup">按跟进时间</option>
            </select>
            <a className="btn ghost sm" href="/api/leads/export">导出 CSV</a>
          </div>
        </div>

        {loading && leads.length === 0 ? (
          <div style={{ padding: '6px 2px' }}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} h={44} style={{ marginBottom: 8 }} />
            ))}
          </div>
        ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>地区</th>
                <th>渠道</th>
                <th>平台</th>
                <th>周时长 / 美区班次</th>
                <th>评分</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const ns = nextStatus(l.status);
                const open = expanded === l.id;
                return (
                  <>
                    <tr
                      key={l.id}
                      className={lastInserted.includes(l.id) ? 'flash-new' : undefined}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(open ? null : l.id)}
                    >
                      <td>
                        <b>{l.first_name} {l.last_name}</b>
                        {lastInserted.includes(l.id) && (
                          <motion.span
                            className="chip tier-A"
                            style={{ marginLeft: 6 }}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 24, delay: 0.2 }}
                          >
                            新
                          </motion.span>
                        )}
                        <div className="sub">{l.handle || l.email}</div>
                      </td>
                      <td>{l.location}</td>
                      <td>{channelLabel(l.channel)}</td>
                      <td className="sub">{safeParsePlatforms(l.platforms).join(' · ') || '—'}</td>
                      <td>
                        {l.hours_per_week}h/周{l.us_shift ? ' · ✓美区班次' : ''}
                      </td>
                      <td>
                        <b>{l.score ?? '—'}</b>{' '}
                        <span className={`chip tier-${l.tier ?? 'C'}`}>{l.tier ?? '—'}</span>
                      </td>
                      <td>
                        <motion.span
                          key={l.status}
                          className={`chip status s-${l.status}`}
                          initial={{ scale: 0.85, opacity: 0.4 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.18, ease: 'easeOut' }}
                        >
                          {STATUS_LABELS[l.status]}
                        </motion.span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row" style={{ gap: 6 }}>
                          {ns && (
                            <button className="btn sm" onClick={() => move(l, ns)}>→ {STATUS_LABELS[ns]}</button>
                          )}
                          {l.status !== 'rejected' && l.status !== 'onboarded' && (
                            <button className="btn sm danger-ghost" onClick={() => move(l, 'rejected')}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr key={`${l.id}-detail`}>
                        <td colSpan={8} style={{ background: 'var(--panel-2)' }}>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="small" style={{ padding: '4px 2px' }}>
                              <b>评分明细：</b>
                              {scoreLead(l).reasons.map((r, ri) => (
                                <motion.span
                                  key={ri}
                                  style={{ display: 'inline-block', marginRight: 4 }}
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, delay: 0.08 + ri * 0.05, ease: 'easeOut' }}
                                >
                                  {r}；
                                </motion.span>
                              ))}
                              <br />
                              <b className="muted">档案：</b>
                              <span className="muted">
                                {l.email || '无邮箱'} · 英文样题 {l.english_sample}/25 ·{' '}
                                {l.us_clients_exp ? '有美区/欧区客户经验' : '无美区客户经验'} ·{' '}
                                {l.chat_exp ? '有粉丝聊天经验' : '无聊天经验'} · {l.crm_exp ? '用过 CRM' : '未用过 CRM'} ·{' '}
                                领域 {l.niche || '—'} · 导入 {new Date(l.created_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <Toast msg={toast} />
    </>
  );
}

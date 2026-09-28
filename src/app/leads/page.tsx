'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Lead } from '../../lib/types';
import { COUNTRIES, SOURCES, STATUSES, countryByCode, fmtDate, todayStr } from '../../lib/types';
import Drawer from '../../components/Drawer';
import Toast from '../../components/Toast';
import { Icon } from '../../components/Icons';
import { Skeleton } from '../../components/motion';

interface Report {
  total: number;
  nw: number;
  merged: number;
  invalid: number;
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsInner />
    </Suspense>
  );
}

function LeadsInner() {
  const params = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', country: '', source: '', tier: '', status: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'score' | 'msg' | 'log' | 'edit'>('score');
  const [importOpen, setImportOpen] = useState(false);
  const [paste, setPaste] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) sp.set(k, v);
    setLoading(true);
    fetch(`/api/leads?${sp}`)
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads as Lead[]);
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const open = params.get('open');
    const tab = params.get('tab');
    if (open) {
      setDrawerId(open);
      setDrawerTab(tab === 'edit' ? 'edit' : 'score');
    }
  }, [params]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const drawerLead = leads.find((l) => l.id === drawerId) ?? null;

  async function runImport() {
    const res = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ csv: paste, filename: 'paste.csv' }),
    });
    const r = (await res.json()) as Report;
    setImportOpen(false);
    setPaste('');
    if (!r.total && !r.invalid) {
      setToast('未识别到有效行，请检查表头');
      return;
    }
    setReport(r);
    load();
  }

  async function bulk(action: 'grade' | 'msg') {
    const ids = selected.size ? [...selected] : leads.map((l) => l.id);
    const res = await fetch('/api/leads/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids, action }),
    });
    const d = (await res.json()) as { n: number };
    load();
    setToast(action === 'grade' ? `已对 ${d.n} 条线索重新分级` : `已为 ${d.n} 条新线索生成首触文案（未发送）`);
  }

  async function exportCsv() {
    const ids = selected.size ? `?ids=${[...selected].join(',')}` : '';
    const res = await fetch(`/api/leads/export${ids}`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `onely_leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast(`已导出 ${selected.size || leads.length} 条线索`);
  }

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  return (
    <>
      <div className="hint-banner">
        <Icon name="info" />
        支持 CSV 文件 / 粘贴导入；系统按邮箱、主页链接、电话自动归一化去重，并按评分模型批量分级。可点击任意行查看评分明细、生成专属触达文案。
      </div>

      <div className="toolbar">
        <input
          className="field search"
          placeholder="搜索姓名 / 城市 / 简介…"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select className="field" value={filters.country} onChange={(e) => setFilters({ ...filters, country: e.target.value })}>
          <option value="">全部地区</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
          ))}
        </select>
        <select className="field" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
          <option value="">全部来源</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="field" value={filters.tier} onChange={(e) => setFilters({ ...filters, tier: e.target.value })}>
          <option value="">全部分级</option>
          <option>S</option>
          <option>A</option>
          <option>B</option>
          <option>C</option>
        </select>
        <select className="field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">全部状态</option>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => setImportOpen(true)}>
          <Icon name="import" />
          导入线索
        </button>
        <button className="btn btn-sm" onClick={() => bulk('grade')}>
          <Icon name="grade" />
          批量分级
        </button>
        <button className="btn btn-sm" onClick={() => bulk('msg')}>
          <Icon name="outreach" />
          批量文案
        </button>
        <button className="btn btn-sm" onClick={exportCsv}>
          <Icon name="export" />
          导出 CSV
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 135 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 118 }} />
            <col style={{ width: 104 }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>姓名</th>
              <th>地区</th>
              <th>来源</th>
              <th>擅长平台</th>
              <th>美国经验</th>
              <th>分级</th>
              <th>状态</th>
              <th>下次跟进</th>
            </tr>
          </thead>
          <tbody>
            {loading && leads.length === 0
              ? [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9}>
                      <Skeleton h={26} />
                    </td>
                  </tr>
                ))
              : leads.map((l) => {
                  const c = countryByCode(l.country);
                  const st = STATUSES.find((s) => s.key === l.status)!;
                  const due = l.next_followup_at && l.next_followup_at <= todayStr();
                  return (
                    <tr key={l.id} className={selected.has(l.id) ? 'selected' : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={selected.has(l.id)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => toggle(l.id, e.target.checked)}
                        />
                      </td>
                      <td onClick={() => setDrawerId(l.id)}>
                        <b>{l.name}</b>
                        <div className="cell-sub">{c.flag} {l.city}</div>
                      </td>
                      <td onClick={() => setDrawerId(l.id)}>{c.name}</td>
                      <td onClick={() => setDrawerId(l.id)}>
                        {l.source}
                        {l.dup_count > 0 && <span className="tag-mini">合{l.dup_count}</span>}
                      </td>
                      <td onClick={() => setDrawerId(l.id)}>
                        {l.platforms.slice(0, 3).map((p) => p).join(' / ') || '—'}
                        {l.platforms.length > 3 ? ' …' : ''}
                      </td>
                      <td className="num" onClick={() => setDrawerId(l.id)}>
                        {l.us_years ? l.us_years + ' 年' : <span className="muted">—</span>}
                      </td>
                      <td onClick={() => setDrawerId(l.id)}>
                        <span className={`tier-badge tier-${l.tier}`}>{l.tier}</span>
                      </td>
                      <td onClick={() => setDrawerId(l.id)}>
                        <span className={`pill st-${l.status}`}>
                          <span className="dot" style={{ background: st.color }} />
                          {st.label}
                        </span>
                      </td>
                      <td className={'small ' + (due ? 'tbd' : 'muted')} onClick={() => setDrawerId(l.id)}>
                        {l.next_followup_at ? fmtDate(l.next_followup_at) : '—'}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        <div className="table-foot">
          <span>{leads.length} 条（筛选后）</span>
          <span className="small muted">已选 {selected.size} 条 · 点击行查看详情</span>
        </div>
      </div>

      {/* 导入模态 */}
      <div className={`overlay${importOpen ? ' show' : ''}`} onClick={() => setImportOpen(false)} />
      <div className={`modal${importOpen ? ' show' : ''}`}>
        <div className="modal-head">
          <h3>导入线索</h3>
          <button className="icon-close" style={{ position: 'static', marginLeft: 'auto' }} onClick={() => setImportOpen(false)}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <div className="modal-body">
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <button
              className="btn btn-sm"
              onClick={async () => {
                const t = await (await fetch('/sample-leads.csv')).text();
                setPaste(t);
              }}
            >
              载入演示 CSV（含重复数据）
            </button>
            <label className="btn btn-sm" htmlFor="csvFile">选择 CSV 文件</label>
            <input
              type="file"
              id="csvFile"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPaste(await f.text());
                e.target.value = '';
              }}
            />
            <a className="btn btn-sm" href="/lead-template.csv" download>
              <Icon name="export" />
              下载模板
            </a>
          </div>
          <label className="flab">或直接粘贴 CSV（首行表头）</label>
          <textarea
            className="field"
            rows={10}
            style={{ width: '100%', fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12 }}
            placeholder="name,email,country,source,profile_url,platforms,us_years,english,rating,hours,timezone_overlap,ai_tools,notes"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
          />
          <div className="small muted mt8">
            去重键：email（忽略大小写）、profile_url（归一化域名/尾斜杠）、phone（仅留数字）。重复记录将合并并保留最早一条。
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={() => setImportOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={runImport} disabled={!paste.trim()}>导入并去重分级</button>
        </div>
      </div>

      {/* 导入报告模态 */}
      <div className={`overlay${report ? ' show' : ''}`} onClick={() => setReport(null)} />
      <div className={`modal${report ? ' show' : ''}`} style={{ width: 520 }}>
        <div className="modal-head">
          <h3>导入完成</h3>
        </div>
        <div className="modal-body">
          {report && (
            <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
              <tbody>
                <tr><td className="muted" style={{ padding: '7px 0' }}>读取数据行</td><td className="num" style={{ textAlign: 'right' }}>{report.total}</td></tr>
                <tr><td className="muted" style={{ padding: '7px 0' }}>新增入库</td><td className="num yes" style={{ textAlign: 'right' }}>{report.nw}</td></tr>
                <tr><td className="muted" style={{ padding: '7px 0' }}>重复合并</td><td className="num tbd" style={{ textAlign: 'right' }}>{report.merged}</td></tr>
                <tr><td className="muted" style={{ padding: '7px 0' }}>无效行</td><td className="num no" style={{ textAlign: 'right' }}>{report.invalid}</td></tr>
              </tbody>
            </table>
          )}
          <div className="small muted mt16">重复记录已合并到最早条目，来源与备注已拼接，可在线索表查看「合 N」标记。</div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-primary" onClick={() => setReport(null)}>知道了</button>
        </div>
      </div>

      <Drawer
        lead={drawerLead}
        initialTab={drawerTab}
        onClose={() => {
          setDrawerId(null);
          if (params.get('open')) window.history.replaceState(null, '', '/leads');
        }}
        onChanged={load}
      />
      <Toast msg={toast} />
    </>
  );
}

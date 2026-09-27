'use client';
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Stats } from '../lib/stats';
import { TARGET } from '../lib/stats';
import { CountUp, Skeleton } from '../components/motion';

function pctText(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`;
}

function LoadingSkeleton() {
  return (
    <>
      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi" key={i}>
            <Skeleton h={12} w={70} />
            <Skeleton h={30} w={90} style={{ marginTop: 10 }} />
            <Skeleton h={10} w={110} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton h={14} w={180} />
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} h={26} style={{ marginTop: 10 }} />
        ))}
      </div>
    </>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((s) => setStats(s as Stats));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (!stats) return <LoadingSkeleton />;

  const { totals, funnel, byChannel, pace, rates } = stats;
  const maxReached = Math.max(...funnel.map((f) => f.reached), 1);
  const cumActual = pace.reduce((s, d) => s + d.onboarded, 0);
  const remain = Math.max(TARGET - totals.onboarded, 0);

  return (
    <>
      <div className="page-head row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2>数据看板</h2>
          <p>
            <span className="live-dot" />
            三天冲刺实时漏斗 · 目标 {TARGET} 名 Operator 入驻
          </p>
        </div>
        <button className="btn ghost sm" onClick={load}>↻ 刷新</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="label">线索总量</div>
          <div className="value">
            <CountUp value={totals.leads} />
          </div>
          <div className="sub small muted">去重后有效线索</div>
        </div>
        <div className="kpi">
          <div className="label">已入驻 / 目标</div>
          <div className="value">
            <CountUp value={totals.onboarded} /> <small>/ {TARGET}</small>
          </div>
          <div className="sub">
            <div className="progress">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, totals.targetPct * 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              还差 {remain} 人 · 完成率 {Math.round(totals.targetPct * 100)}%
            </div>
          </div>
        </div>
        <div className="kpi">
          <div className="label">到期待跟进</div>
          <div className="value" style={{ color: totals.followupsDue ? 'var(--warn)' : undefined }}>
            <CountUp value={totals.followupsDue} />
          </div>
          <div className="sub small muted">D1 提醒 / Offer 催签</div>
        </div>
        <div className="kpi">
          <div className="label">A 级线索</div>
          <div className="value" style={{ color: 'var(--ok)' }}>
            <CountUp value={totals.aTier} />
          </div>
          <div className="sub small muted">≥75 分 · 当天直发 Offer</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.35fr 1fr', marginBottom: 16 }}>
        <div className="card">
          <h3>招募漏斗（按到达过该阶段统计）</h3>
          {funnel.map((f, i) => (
            <div className="funnel-row" key={f.status}>
              <div className="small muted">{f.label}</div>
              <div className="funnel-bar-wrap">
                <motion.div
                  className="funnel-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(4, (f.reached / maxReached) * 100)}%` }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: 'easeOut' }}
                >
                  {f.reached}
                </motion.div>
              </div>
              <motion.div
                className="conv"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.1 + i * 0.06 + 0.35 }}
              >
                {f.convFromPrev == null ? '入口' : <>转化 <b>{pctText(f.convFromPrev)}</b></>}
              </motion.div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3>三日节奏 vs 目标线</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {pace.map((d, i) => (
              <motion.div
                key={d.day}
                className="card"
                style={{ padding: 12, background: 'var(--panel-2)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
              >
                <div className="small muted">
                  {d.day} · {d.date}
                </div>
                <div style={{ fontSize: 22, fontWeight: 750, margin: '4px 0 8px' }}>
                  <CountUp value={d.onboarded} />
                </div>
                <div className="progress">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (d.onboarded / 34) * 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                  />
                </div>
                <div className="small muted" style={{ marginTop: 6 }}>日均目标 34</div>
              </motion.div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 12 }}>
            累计 <b style={{ color: 'var(--text)' }}>{cumActual}</b> / D{totals.currentDay} 目标线{' '}
            <b style={{ color: 'var(--text)' }}>{totals.targetNow}</b> · 按当前速率预计{' '}
            <b style={{ color: 'var(--text)' }}>{Math.max(0, Math.ceil(remain / Math.max(cumActual / 2.6, 1)))}</b>{' '}
            天后补齐缺口
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>关键转化率</h3>
        <div className="row" style={{ gap: 28 }}>
          {(
            [
              ['回复率', rates.replyRate],
              ['报名率', rates.applyRate],
              ['样题完成率', rates.sampleRate],
              ['Offer 接受率', rates.acceptRate],
            ] as const
          ).map(([label, v], i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 + i * 0.06, ease: 'easeOut' }}
            >
              <div className="small muted">{label}</div>
              <div style={{ fontSize: 21, fontWeight: 750 }}>{pctText(v)}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>分渠道表现</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>渠道</th>
                <th>线索</th>
                <th>已触达</th>
                <th>已回复</th>
                <th>回复率</th>
                <th>已报名</th>
                <th>已入驻</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map((c, i) => (
                <motion.tr
                  key={c.channel}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                >
                  <td>{c.label}</td>
                  <td>{c.leads}</td>
                  <td>{c.contacted}</td>
                  <td>{c.replied}</td>
                  <td>
                    <span className={c.replyRate != null && c.replyRate >= 0.2 ? 'chip tier-A' : 'chip tier-C'}>
                      {pctText(c.replyRate)}
                    </span>
                  </td>
                  <td>{c.applied}</td>
                  <td>
                    <b style={{ color: 'var(--ok)' }}>{c.onboarded}</b>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

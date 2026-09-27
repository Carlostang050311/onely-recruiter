'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Stats } from '../lib/stats';
import { EChart, baseAxis } from '../components/charts';
import { CountUp, Skeleton } from '../components/motion';

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const load = useCallback(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((s) => setStats(s as Stats));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const funnelOption = useMemo(() => {
    if (!stats) return {};
    const c = stats.funnel;
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} 人' },
      series: [
        {
          type: 'funnel',
          left: '8%',
          right: '8%',
          top: 10,
          bottom: 10,
          minSize: '24%',
          gap: 3,
          label: {
            position: 'inside',
            fontSize: 10.5,
            color: '#f6efea',
            formatter: (p: { name: string; value: number }) => {
              const m: Record<string, string> = { 有效: '线索', 已触: '触达', 已回: '回复', 通过: '通过', 已入: '入驻' };
              return (m[p.name.slice(0, 2)] || p.name.slice(0, 2)) + ' ' + p.value;
            },
          },
          itemStyle: { borderColor: '#151012', borderWidth: 2 },
          data: [
            { name: '有效线索', value: c.leads, itemStyle: { color: '#6b5650' } },
            { name: '已触达', value: c.contacted, itemStyle: { color: '#5d6f96' } },
            { name: '已回复', value: c.replied, itemStyle: { color: '#b8894a' } },
            { name: '通过筛选', value: c.qualified, itemStyle: { color: '#8e6cab' } },
            { name: '已入驻（目标100）', value: c.onboarded, itemStyle: { color: '#6d9470' } },
          ],
        },
      ],
    };
  }, [stats]);

  const dailyOption = useMemo(() => {
    if (!stats) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['计划', '实际'], textStyle: { color: '#b39e98', fontSize: 11 }, top: 0, right: 0 },
      grid: { left: 38, right: 14, top: 34, bottom: 28 },
      xAxis: { type: 'category', data: ['Day 1', 'Day 2', 'Day 3'], ...baseAxis(), splitLine: { show: false } },
      yAxis: { type: 'value', ...baseAxis() },
      series: [
        { name: '计划', type: 'bar', data: stats.daily.plan, barWidth: 18, itemStyle: { color: 'rgba(216,164,93,.35)', borderRadius: [4, 4, 0, 0] } },
        { name: '实际', type: 'bar', data: stats.daily.actual, barWidth: 18, itemStyle: { color: '#c84c66', borderRadius: [4, 4, 0, 0] } },
      ],
    };
  }, [stats]);

  const sourceOption = useMemo(() => {
    if (!stats) return {};
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 118, right: 24, top: 8, bottom: 8 },
      xAxis: { type: 'value', ...baseAxis() },
      yAxis: { type: 'category', data: stats.sources.map((e) => e[0]), ...baseAxis(), splitLine: { show: false } },
      series: [
        {
          type: 'bar',
          data: stats.sources.map((e) => e[1]),
          barWidth: 11,
          itemStyle: { color: '#c84c66', borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: 'right', color: '#b39e98', fontSize: 11 },
        },
      ],
    };
  }, [stats]);

  const geoOption = useMemo(() => {
    if (!stats) return {};
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 16, top: 14, bottom: 24 },
      xAxis: { type: 'category', data: stats.geo.map((g) => g.flag + ' ' + g.code), ...baseAxis(), splitLine: { show: false } },
      yAxis: { type: 'value', ...baseAxis() },
      series: [
        {
          type: 'bar',
          data: stats.geo.map((g) => g.count),
          barWidth: 22,
          itemStyle: { color: '#d8a45d', borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: '#b39e98', fontSize: 11 },
        },
      ],
    };
  }, [stats]);

  const tierOption = useMemo(() => {
    if (!stats) return {};
    const t = stats.tiers;
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 38, right: 16, top: 18, bottom: 24 },
      xAxis: { type: 'category', data: ['S', 'A', 'B', 'C'], ...baseAxis(), splitLine: { show: false } },
      yAxis: { type: 'value', ...baseAxis() },
      series: [
        {
          type: 'bar',
          barWidth: 30,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          label: { show: true, position: 'top', color: '#b39e98', fontSize: 11 },
          data: [
            { value: t.S, itemStyle: { color: '#d8a45d' } },
            { value: t.A, itemStyle: { color: '#c84c66' } },
            { value: t.B, itemStyle: { color: '#8ea2c4' } },
            { value: t.C, itemStyle: { color: '#6b5650' } },
          ],
        },
      ],
    };
  }, [stats]);

  const savingsOption = useMemo(() => {
    if (!stats) return {};
    const s = stats.savings;
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['纯人工', '自动化后'], textStyle: { color: '#b39e98', fontSize: 11 }, top: 0, right: 0 },
      grid: { left: 86, right: 20, top: 32, bottom: 8 },
      xAxis: { type: 'value', ...baseAxis() },
      yAxis: { type: 'category', data: s.cats, ...baseAxis(), splitLine: { show: false } },
      series: [
        { name: '纯人工', type: 'bar', data: s.manH, barWidth: 9, itemStyle: { color: '#8a5a62', borderRadius: [0, 3, 3, 0] } },
        { name: '自动化后', type: 'bar', data: s.autH, barWidth: 9, itemStyle: { color: '#7fa982', borderRadius: [0, 3, 3, 0] } },
      ],
    };
  }, [stats]);

  if (!stats) {
    return (
      <>
        <div className="grid kpi-row section-gap">
          {[...Array(6)].map((_, i) => (
            <div className="card kpi" key={i}>
              <Skeleton h={12} w={80} />
              <Skeleton h={30} w={70} style={{ marginTop: 10 }} />
              <Skeleton h={10} w={90} style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div className="card">
          <Skeleton h={285} />
        </div>
      </>
    );
  }

  const k = stats.kpi;
  const s = stats.savings;

  return (
    <>
      <div className="grid kpi-row section-gap">
        <div className="card kpi">
          <div className="kpi-lab"><span className="dot" style={{ background: 'var(--muted)' }} />有效线索</div>
          <div className="kpi-val num"><CountUp value={k.leads} /></div>
          <div className="kpi-delta">去重后入库</div>
        </div>
        <div className="card kpi">
          <div className="kpi-lab"><span className="dot" style={{ background: 'var(--blue)' }} />已触达</div>
          <div className="kpi-val num"><CountUp value={k.contacted} /></div>
          <div className="kpi-delta">触达率 {k.contactRate}%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-lab"><span className="dot" style={{ background: 'var(--gold)' }} />已回复</div>
          <div className="kpi-val num"><CountUp value={k.replied} /></div>
          <div className="kpi-delta">回复率 {k.replyRate}%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-lab"><span className="dot" style={{ background: '#b794d1' }} />通过筛选</div>
          <div className="kpi-val num"><CountUp value={k.qualified} /></div>
          <div className="kpi-delta">合格率 {k.qualRate}%</div>
        </div>
        <div className="card kpi accent">
          <div className="kpi-lab"><span className="dot" style={{ background: 'var(--green)' }} />已入驻</div>
          <div className="kpi-val num"><CountUp value={k.onboarded} /></div>
          <div className="kpi-delta up">入驻转化 {k.onbRate}%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-lab"><span className="dot" style={{ background: 'var(--brand)' }} />S+A 高优线索</div>
          <div className="kpi-val num"><CountUp value={k.hot} /></div>
          <div className="kpi-delta">占比 {k.hotRate}%</div>
        </div>
      </div>

      <div className="grid section-gap" style={{ gridTemplateColumns: '1.35fr 1fr' }}>
        <div className="card">
          <div className="card-title">转化漏斗 <span className="sub">实际 vs 3天100人目标</span></div>
          <EChart option={funnelOption} />
        </div>
        <div className="card">
          <div className="card-title">每日入驻节奏 <span className="sub">计划 / 实际</span></div>
          <EChart option={dailyOption} />
        </div>
      </div>

      <div className="grid section-gap" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="card">
          <div className="card-title">线索来源分布</div>
          <EChart option={sourceOption} className="chart-box sm" />
        </div>
        <div className="card">
          <div className="card-title">地区分布</div>
          <EChart option={geoOption} className="chart-box sm" />
        </div>
        <div className="card">
          <div className="card-title">能力分级</div>
          <EChart option={tierOption} className="chart-box sm" />
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">自动化降本测算 <span className="sub">以 1,000 条有效线索的一期战役为口径</span></div>
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'center' }}>
          <EChart option={savingsOption} className="chart-box sm" />
          <div>
            <div className="info-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div><div className="k">纯人工运营所需工时</div><div className="v num">{s.manualTotal} 小时</div></div>
              <div><div className="k">本工具自动化后工时</div><div className="v num">{s.autoTotal} 小时</div></div>
              <div><div className="k">节省工时 / 降幅</div><div className="v num" style={{ color: 'var(--green)' }}>{s.saved} 小时（{s.savedPct}%）</div></div>
              <div><div className="k">等效人力（按 8h/天）</div><div className="v num">{s.fteManual} 人 → {s.fteAuto} 人（3天战役）</div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icons';

const TITLES: Record<string, [string, string]> = {
  '/': ['作战仪表盘', 'Onely 情感陪伴业务 · 海外社媒运营招募实况'],
  '/leads': ['线索库与分级', '导入去重、评分分级，点击行查看详情'],
  '/pipeline': ['跟进看板', '阶段流转、到期提醒，拖拽卡片即可更新'],
  '/outreach': ['触达文案台', '渠道模板 + 个性化钩子，批量生成与模拟发送'],
  '/plan': ['3 天增长方案', '来源、筛选、漏斗、入驻后管理培训留存'],
  '/scope': ['范围与假设', '已实现功能 vs 待验证假设'],
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [title, desc] = TITLES[pathname] ?? TITLES['/'];

  async function reset() {
    if (!window.confirm('确定清空并重置为内置演示数据？')) return;
    setBusy(true);
    await fetch('/api/seed', { method: 'POST' });
    router.refresh();
    window.location.reload();
  }

  async function quickAdd() {
    const res = await fetch('/api/leads', { method: 'POST' });
    const data = (await res.json()) as { lead: { id: string } };
    router.push(`/leads?open=${data.lead.id}&tab=edit`);
  }

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        <div className="desc">{desc}</div>
      </div>
      <div className="spacer" />
      <button className="btn btn-sm" onClick={reset} disabled={busy}>
        <Icon name="reset" />
        重置演示数据
      </button>
      <button className="btn btn-sm btn-primary" onClick={quickAdd}>
        <Icon name="plus" />
        新建线索
      </button>
    </header>
  );
}

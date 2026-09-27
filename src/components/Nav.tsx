'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BrandMark, Icon } from './Icons';
import { TARGET } from '../lib/stats';

const ITEMS = [
  { href: '/', label: '作战仪表盘', icon: 'dashboard' },
  { href: '/leads', label: '线索库与分级', icon: 'leads' },
  { href: '/pipeline', label: '跟进看板', icon: 'pipeline' },
  { href: '/outreach', label: '触达文案台', icon: 'outreach' },
  { href: '/plan', label: '3天增长方案', icon: 'plan' },
  { href: '/scope', label: '范围与假设', icon: 'scope' },
];

export default function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [onboarded, setOnboarded] = useState(0);

  const load = useCallback(() => {
    fetch('/api/stats')
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return r.json();
      })
      .then((s) => {
        if (s) setOnboarded(s.kpi.onboarded as number);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load, pathname]);

  return (
    <aside className="sidebar" id="sidebar">
      <div className="brand">
        <BrandMark />
        <div>
          <div className="brand-name">Onely</div>
          <div className="brand-sub">Operator Console</div>
        </div>
      </div>
      <nav className="nav">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className={`nav-item${pathname === it.href ? ' active' : ''}`} onClick={onNavigate}>
            <Icon name={it.icon} />
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="side-target">
        <div className="lab">首期入驻目标 · 3天</div>
        <div className="big num">
          <b>{onboarded}</b> / {TARGET}
        </div>
        <div className="progress">
          <i style={{ width: `${Math.min(100, onboarded)}%` }} />
        </div>
      </div>
    </aside>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: '数据看板', icon: '◧' },
  { href: '/leads', label: '线索与导入', icon: '⛁' },
  { href: '/pipeline', label: '跟进看板', icon: '⚑' },
  { href: '/outreach', label: '触达文案', icon: '✉' },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Onely Recruiter</h1>
        <p>Operator 招募冲刺 · 3 天 / 100 人</p>
      </div>
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className={`nav-item${pathname === it.href ? ' active' : ''}`}>
          <span>{it.icon}</span>
          {it.label}
        </Link>
      ))}
      <div className="sidebar-foot">
        onely.cc · Private Beta
        <br />
        内部招募工具 v0.1
      </div>
    </aside>
  );
}

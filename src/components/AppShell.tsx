'use client';
import { usePathname } from 'next/navigation';
import Nav from './Nav';
import Topbar from './Topbar';
import RouteFade from './RouteFade';

/** /login 与 /sample/* 为独立页（无作战台外壳），其余走 sidebar + topbar 布局 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/login') || pathname.startsWith('/sample')) {
    return <>{children}</>;
  }
  return (
    <div className="app">
      <Nav />
      <div className="main">
        <Topbar />
        <RouteFade>{children}</RouteFade>
      </div>
    </div>
  );
}

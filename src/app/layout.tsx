import type { Metadata } from 'next';
import Providers from '../components/Providers';
import AppShell from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Onely 运营招募作战台 · Operator Growth Console',
  description: 'Onely 情感陪伴业务 Operator 三天百人招募原型：导入去重 / 评分分级 / 个性化触达 / 跟进看板 / 增长方案',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23151012'/%3E%3Ccircle cx='16' cy='16' r='9' fill='none' stroke='%23d8a45d' stroke-width='2.5'/%3E%3Ccircle cx='16' cy='16' r='3.5' fill='%23c84c66'/%3E%3C/svg%3E"
        />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

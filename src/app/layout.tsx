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
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
        />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

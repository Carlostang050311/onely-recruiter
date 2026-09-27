import type { Metadata } from 'next';
import Nav from '../components/Nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Onely Recruiter — Operator 招募冲刺',
  description: 'Onely 情感陪伴业务 Operator 三天百人招募原型：导入去重 / 评分分级 / 个性化触达 / 跟进看板 / 漏斗数据',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <Nav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

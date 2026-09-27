/** @type {import('next').NextConfig} */
const nextConfig = {
  // 原生模块不打包不 trace：本地与 Vercel 均从 node_modules 直接 require
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;

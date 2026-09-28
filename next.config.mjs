/** @type {import('next').NextConfig} */
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === '1';

const nextConfig = {
  // WASM/原生模块不打包不 trace：从 node_modules 直接 require
  serverExternalPackages: ['sql.js'],
  // 显式把 sql.js 的 wasm 资源带进 serverless 函数包（否则运行时报 ENOENT）
  outputFileTracingIncludes: {
    '/api/[...slug]': ['./node_modules/sql.js/dist/sql-wasm.wasm'],
  },
  ...(IS_STATIC
    ? {
        output: 'export',
        trailingSlash: true,
        basePath: '/onely-recruiter',
        assetPrefix: '/onely-recruiter/',
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

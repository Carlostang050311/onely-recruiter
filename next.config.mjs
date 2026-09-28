/** @type {import('next').NextConfig} */
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === '1';

const nextConfig = {
  // WASM/原生模块不打包不 trace：从 node_modules 直接 require（sql.js 的 wasm 资源随包走）
  serverExternalPackages: ['sql.js'],
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

/** @type {import('next').NextConfig} */
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === '1';

const nextConfig = {
  // WASM 包外置：从 node_modules 直接 require（asm.js 构建无外部资产）
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

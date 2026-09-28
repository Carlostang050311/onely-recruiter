/** @type {import('next').NextConfig} */
const nextConfig = {
  // WASM/原生模块不打包不 trace：从 node_modules 直接 require（sql.js 的 wasm 资源随包走）
  serverExternalPackages: ['sql.js'],
};

export default nextConfig;

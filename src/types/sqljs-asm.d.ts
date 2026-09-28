// sql.js 的 asm.js 构建（纯 JS，无外部 wasm 资产）类型声明
declare module 'sql.js/dist/sql-asm.js' {
  import type { SqlJsStatic } from 'sql.js';
  const initSqlJs: (config?: unknown) => Promise<SqlJsStatic>;
  export default initSqlJs;
}

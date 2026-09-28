# AGENTS.md — onely-recruiter

## 背景痛点（为什么做）

Onely（onely.cc，AI 驱动的创作者商业平台，订阅 + 积分制，Private Beta）首期情感陪伴业务需要在 **3 天内招募 100 名 Operator**（粉丝关系运营），人选分布在菲律宾、尼日利亚、肯尼亚等地，特征是：有美区社媒代运营经验、能上美区班次、英文书面过关。人工做名单、去重、触达、跟进、评分装不进 3 天，所以用这套作战台把招募运营压缩到「3 人 + 工具」。**双形态已上线**：Vercel 服务端完整版（永久域名，大陆访问需 Clash）+ GitHub Pages 静态演示版（国内直连，数据存 localStorage）——访问矩阵见 README 顶部。

## 需求与输出格式

- 六视图：作战仪表盘（6 KPI + ECharts 六图）/ 线索库与分级（导入去重合并 + 评分分级 + 批量操作）/ 跟进看板（拖拽 + 到期提醒）/ 触达文案台（6 渠道模板 + 个性化钩子 + 模拟发送）/ 3 天增长方案 / 范围与假设。
- 线索抽屉五 Tab：评分与资料 / 触达文案 / 跟进动态 / 编辑（保存即重评分）/ 样题与校准。
- 对外话术统一用 Onely 官方口径："creator fan-relationship operations"（创作者粉丝关系运营），文案为英文（候选人受众），产品 UI 为中文（内部工具）。
- 交付物：本仓库（github.com/Carlostang050311/onely-recruiter）+ README + 演示视频 `demo/onely-recruiter-demo.mp4`（**本地交付，不上传**——用户 2026-09-28 明确）。

## 约束边界

- 数据库：**sql.js（WASM）单驱动**，本地落盘 `data/app.db`、无服务器落 `/tmp`（冷启动重灌种子）；服务端用 asm.js 构建（`sql.js/dist/sql-asm.js`，wasm 版在 Vercel 上报 ENOENT）。禁止换回原生 SQLite 驱动。
- 双形态构建：服务端 `npm run build`；静态版 `node scripts/build-static.mjs`（构建期移走 `src/app/api` + `NEXT_PUBLIC_STATIC=1` 注入 fetch 遮罩，页面代码两形态零改动）。静态导出必须 `trailingSlash: true` + `basePath` + out 根放 `.nojekyll`。
- 安全扫描器（Mimosa）写前三禁：服务端 `fetch` 只允许硬编码字面量 host（LLM 改写在浏览器端直连中转站）；SQL 一律 `prepare` 绑定参数、标识符与调用形态避开 `.exec(`/`.run(变量SQL)`；源码修改只用 Edit/Write（Bash sed 会被拒）。被拦文件未落盘，整份重写。
- 原型不做服务端抓取任意 URL；线索导入一律走 CSV。演示数据全部为虚构人物，不含真实个人信息。
- 认证：会话 cookie（Web Crypto HMAC，Edge/Node 双运行时），角色 operator/lead/finance；seed、批量、导出、留存需 lead 或 finance。环境变量：`USERS`、`SESSION_SECRET`、`DEV_PASS`、`APP_BASE`、`EMAIL_PROVIDER`/`EMAIL_API_KEY`/`EMAIL_FROM`、`SEND_CAP`、`WEBHOOK_SECRET`。

## 参考范例

- 评分模型（满分 100）与分级阈值见 `src/lib/scoring.ts`：美欧创作者经验 24 / TikTok+IG 匹配 16 / 英语 15 / 平台评分 15 / 时区重叠 10 / 周工时 10 / AI 工具 10；**S ≥85 首批直聊 · A ≥70 · B ≥55 · C 婉拒**。
- 文案与个性化钩子见 `src/lib/copy.ts`（6 渠道模板 + D0/D+2/D+4 bump + `personalHooks` 信号钩子）。
- 去重三键与合并语义见 `src/lib/dedup.ts`（email → profile_url 归一化 → phone，重复并入最早一条）。

## 验收标准

1. `npm test` 全绿（47 例）。
2. `npm run build && npm run start` 后六个视图可用；接口冒烟 `node scripts/smoke.mjs`（17 项，`SMOKE_BASE` 可指任何环境）全过。
3. 静态版改代码后：`node scripts/build-static.mjs` → 推 gh-pages → **手动触发 Pages 重建**（`gh api repos/…/pages/builds -X POST`，推送不自动触发）→ 等 CDN 刷新再验证。
4. README 的访问矩阵、环境变量、已实现 vs 待验证三块与代码一致。

## 硬规则

- 任何修改必须有 commit。
- 测试全绿才交付。
- 对外不宣称"已通过安全审计"（仅有随码扫描，全量独立审计未做）。

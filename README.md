# Onely 运营招募作战台 · Operator Growth Console

**公网体验地址**

| 形态 | 地址 | 说明 |
|---|---|---|
| 服务端完整版（Vercel 生产） | https://onely-recruiter.vercel.app | 永久域名；含 webhook 端点、SQLite（/tmp + 冷启动重灌种子）、RBAC；**已通过 17 项生产冒烟**；大陆网络需 Clash 等代理访问（vercel.app 域名被墙），境外直连正常 |
| 静态演示版（GitHub Pages） | https://carlostang050311.github.io/onely-recruiter/ | 数据存浏览器 localStorage；webhook 由看板页「事件模拟器」替代；国内可直连 |
| 服务端完整版（本地） | http://localhost:3777 | `npm run build && npm run start`；落盘 SQLite，数据持久 |
| 服务端完整版（Netlify） | https://onely-ops-console.netlify.app | 已部署 ready；新账号风控边缘锁待平台解除 |
| 代码仓库 | https://github.com/Carlostang050311/onely-recruiter | main = 源码；gh-pages = 静态导出 |

登录账号均为 **dev / onely2026**（lead 角色）；只读体验用 **ops / onely2026**（operator 角色）。

Onely（[onely.cc](https://www.onely.cc)，AI 驱动的创作者商业平台）首期情感陪伴业务的 **Operator 招募作战控制台**：把「3 天找到、触达并促成 100 名有美区社媒运营能力的 Operator 入驻」从 9 人团队的活压缩到 0.5 人 + 工具。

六个视图：作战仪表盘 / 线索库与分级 / 跟进看板 / 触达文案台 / 3 天增长方案 / 范围与假设。技术栈：Next.js 15 + SQLite（Node 内建 `node:sqlite`）+ ECharts 5.5 + framer-motion。

> 演示数据全部为虚构人物（固定随机种子生成），不含真实个人信息。对外话术统一使用 Onely 官方口径「creator fan-relationship operations（创作者粉丝关系运营）」。

---

## 一、运行方式

**环境要求**：Node ≥ 22.5；无需数据库服务、无需 API Key（数据库为 sql.js WASM，零原生依赖）。

```bash
npm install
npm run dev          # 开发模式，http://localhost:3777
# 或生产模式
npm run build && npm run start

# 静态演示版（GitHub Pages 形态）
node scripts/build-static.mjs   # 产出 out/，数据引擎切到浏览器 localStorage
```

静态版与服务端版共用全部页面与逻辑：构建期移走 API 路由、注入 fetch 遮罩（`NEXT_PUBLIC_STATIC=1`），页面代码零改动；差异仅三处——数据存 localStorage、webhook 由看板「事件模拟器」按钮触发、审计/校准/留存运行在浏览器内。

- 首次打开自动灌入 54 条演示线索（预置漏斗：7 入驻 / 6 通过 / 9 回复 / 15 触达 / 17 新）。
- 重置演示数据：顶栏「重置演示数据」，或 `curl -X POST http://localhost:3777/api/seed`。
- 测试：`npm test`（47 个用例：CSV 解析与别名映射 / 三键去重合并 / 7 维评分 / 钩子文案 / 意图分类 / 样题 rubric / 会话与令牌 / PII 留存 / 限频 / 校准统计）。
- 接口冒烟：先启动服务，再 `node scripts/smoke.mjs`（17 项：含登录 RBAC、事件 webhook、样题闭环、退订、留存、审计）。
- 六视图截图：`node scripts/shots.mjs`（含参照稿对照帧，输出到 `demo/shots/`）。

---

## 二、产品需求（六个视图）

| 视图 | 功能点 |
|---|---|
| 作战仪表盘 | 6 KPI（有效线索/已触达/已回复/通过筛选/已入驻/S+A 高优）；ECharts 转化漏斗、每日入驻节奏（计划 vs 实际）、来源分布、地区分布、能力分级、自动化降本测算 |
| 线索库与分级 | CSV 文件/粘贴导入（表头智能映射含中文别名）；三键去重**合并**（email 忽略大小写 / profile_url 归一化 / phone 仅数字，重复并入最早一条并打「合 N」标记）；7 维评分模型 S/A/B/C；勾选批量分级/批量文案/导出；行点击开抽屉 |
| 线索抽屉 | 四 Tab：评分与资料（7 维进度条 + 依据 + 12 项资料）/ 触达文案（选渠道生成、复制、模拟发送）/ 跟进动态（时间线）/ 编辑（保存即重新评分）；底部上一阶段/推进下一阶段 |
| 跟进看板 | 待跟进提醒条（逾期红 / 今日到期金，一键「完成跟进」发下轮文案并重排）；五阶段看板 + 流失列；卡片拖拽跨列或按钮推进；阶段变化自动写时间线 |
| 触达文案台 | 6 渠道模板（邮件含主题长信 / DM 短文案）；变量芯片点击插入；模板可编辑即时生效；按线索经历信号自动插个性化钩子；模拟发送自动记录并排 D+2；D0/D+2/D+4 序列规则 |
| 3 天增长方案 | 作战文档：漏斗数学、10 渠道配额与入口、评分模型与硬门槛/红旗、3 天时间轴、入驻后 Discord/Telegram/Bootcamp/留存/合规六块 |
| 范围与假设 | 已实现功能 vs 待验证假设两栏 + 技术说明与合规提示 |

辅助：顶栏新建线索（开抽屉编辑 Tab）、全量/选中导出 CSV、示例导入文件 `public/sample-leads.csv`（含 2 组故意重复）、模板 `public/lead-template.csv`。

### 评分模型（满分 100，抽屉可见明细）

美国/欧洲创作者运营经验 24 · TikTok/Instagram 平台匹配 16 · 英语写作 15 · 平台评分/好评 15 · 美国时区重叠 10 · 每周可投入小时 10 · AI 工具熟练度 10。
分级：**S ≥85 首批直聊 · A 70–84 · B 55–69 进 waitlist/补训 · C <55 婉拒**。

---

## 三、增长方案（3 天 100 人冲刺，详见「3 天增长方案」视图）

漏斗数学：1,200 原始线索 → 1,000 有效（去重+有效率 83%）→ 950 触达（95%）→ 333 回复（35%）→ 183 通过筛选（55%）→ 100 入驻（55%）。每日节奏 Day1 ≥30 / Day2 ≥35 / Day3 ≥35，缺口 D+5、D+7 加场。

10 渠道配额：OnlineJobs.ph 280 · Facebook 群组 230 · Upwork/Fiverr 190 · LinkedIn 110 · X 110 · Telegram 90 · Discord 50 · 远程人才库 50 · 内推 50 · Reddit 40。

入驻后：Discord 总部（频道矩阵 + onboarding bot + 20 人 squad 编制）；Telegram 按国家广播补位；3 天 Bootcamp（voice bible → AI 内容 SOP → 陪伴话术红线，影子期抽检 20%）；留存（周结薪、里程碑奖金、晋升路径、3 天无 check-in 预警）；合规底座（18+ 年龄门、轻 KYC、电子合同、禁发内容清单）。

### 自动化如何降低人工成本（仪表盘「降本测算」卡）

以 1,000 条有效线索的一期战役为口径：采集录入 2000→50 分钟、去重 800→10、分级 3000→20、文案 4750→48、排期 1425→19、统计 300→5、回复与面试 600→600（人工保留）。合计 **214.6 小时 → 12.5 小时，降 94%；等效人力 9 人 → 0.5 人**。人只保留面试、异常处理与社群温度。

---

## 四、已实现 vs 待验证假设（详见「范围与假设」视图）

**已实现**：导入与表头别名映射；三键去重合并与报告；7 维评分与 S/A/B/C、批量分级；6 渠道模板 + 个性化钩子 + 批量文案；模拟发送与 D+2/D+4 排期、跟进时间线；看板拖拽/按钮流转与到期提醒；六图表统计与降本测算；SQLite 持久化/重置/导出；增长文档与范围页。

**待验证**：渠道供给（3 天 1,200 条、有效率 83%）；转化率（35%/55%/55% 为行业估值）；$300–800/账号/月与周结的真实吸引力；FB/Telegram 群规与封号风险；PH/NG 对陪伴类账号的接受度与合规；Discord vs Telegram 主阵地偏好；$25 内推转化；AI 起草内容的平台审核风险；周结通道成本与税务。建议 Day1 先 100 条小样本校准漏斗。

---

## 五、战役引擎与生产护栏

**认证与 RBAC**：会话 cookie（HMAC 签名，Web Crypto 双运行时）；角色 operator / lead / finance。重置、批量、导出、留存清理需 lead 或 finance。环境变量：`USERS="id:pass:role;…"`、`SESSION_SECRET`；开发默认 `dev / onely2026`（lead）、`ops / onely2026`（operator），登录页仅开发环境显示提示。

**事件驱动自动推进**（webhook，`x-webhook-key` 默认 `onely-hook`，生产用 `WEBHOOK_SECRET`）：

```bash
curl -X POST localhost:3777/api/webhook -H 'content-type: application/json' -H 'x-webhook-key: onely-hook' \
  -d '{"type":"reply","email":"x@y.com","text":"How does the payout work?"}'   # 意图分类→已回复/流失
curl -X POST localhost:3777/api/webhook ... -d '{"type":"form","email":"x@y.com","quiz_score":5}'  # ≥4 自动通过筛选
curl -X POST localhost:3777/api/webhook ... -d '{"type":"sign","email":"x@y.com"}'                 # 电子签→已入驻
```

生产接线：表单平台（Tally/Google Form）→ form；ESP 入站（Postmark inbound）或 IMAP 轮询 → reply；电子签回调 → sign。

**真实发送通道与合规**：配置 `EMAIL_PROVIDER=resend|postmark` + `EMAIL_API_KEY` + `EMAIL_FROM` 后邮件真发（endpoint 硬编码字面量 host）；未配置即模拟发送。邮件自动附加退订页脚（`/api/unsubscribe?t=<hmac>`，退订即流失）。每渠道日限频 `SEND_CAP`（默认 100，超出 429）。Telegram 生产接线请经自有出口代理（代理侧做 host 白名单），原型阶段模拟。

**样题闭环与校准**：抽屉「样题与校准」Tab 发放样题 → 候选人公开页 `/sample/<token>` 作答 3 条脚本化粉丝消息 → 提交后规则版 rubric 机评（共情 30 / 人设 25 / 语法 20 / 转化 15 / 红线 10）→ 人工修正留痕 → 「范围与假设」页出机评人评一致性报告（平均绝对偏差、±10 内占比）。机评 <60 自动提示 waitlist/婉拒。

**审计与 PII 留存**：全部写操作（发送/推进/编辑/导入/重置/修正/留存）进审计日志（scope 页可见最近 15 条）；`POST /api/admin/retention {days:90}` 将超期 lost 线索匿名化（姓名→Anonymized-ID，清空联系方式与备注），scope 页有一键按钮。

---

## 六、安全与合规说明

- 服务端不抓取任意 URL；导入一律走 CSV/表单回收。
- 演示数据为虚构；真实使用时导入源须带候选人同意文本，遵守各平台 ToS 与数据保护法规，群发控频并提供退订。
- 陪伴话术红线与禁发内容清单见增长方案「合规底座」。

---

## 七、演示视频

成品：`demo/onely-recruiter-demo.mp4`（3 分 45 秒，七节：仪表盘→导入去重→抽屉评分→跟进看板→触达台→增长方案与范围→降本收尾；中文配音 edge-tts Yunxi）。重新生成：

```bash
pip install edge-tts        # 配音；失败时脚本自动回落 Windows 自带语音
node scripts/make-video.mjs # 分节录屏(Playwright) + 配音 + ffmpeg 合成
```

## 八、项目结构

```
src/lib/        types / scoring(7维) / dedup(三键合并) / copy(6模板+钩子) / csv+csv-base / seed / stats / store / db
                auth(会话+令牌) / audit / sender(真发+限频+退订) / sample(rubric+校准) / retention / classify / roles
src/app/        六视图 + login + sample/[token] 公开页 + /api（leads、import、export、bulk、[id]、[id]/stage、
                [id]/message、[id]/sample、webhook、webhook/sample、unsubscribe、login、audit、admin/retention、stats、seed）
src/middleware.ts  认证门与 RBAC
src/components/ Nav / Topbar / AppShell / Drawer(5 Tab) / Toast / Icons / charts(ECharts) / motion / Providers / RouteFade
tests/          vitest 单元用例（5 文件 47 例）
scripts/        smoke 冒烟 / shots 截图(含参照稿对照) / make-video 演示视频
public/         sample-leads.csv（含故意重复）/ lead-template.csv
demo/           shots 截图与成片
```

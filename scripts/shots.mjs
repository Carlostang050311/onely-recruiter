// 四页截图（验证渲染用）：node scripts/shots.mjs
// 依赖本机 http://localhost:3777 已启动。优先内置 chromium，缺浏览器时回落本机 Edge/Chrome。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('demo/shots', { recursive: true });

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    for (const channel of ['msedge', 'chrome']) {
      try {
        return await chromium.launch({ channel });
      } catch { /* try next */ }
    }
    throw new Error('no usable browser: run npx playwright install chromium');
  }
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });

// 干净状态
await fetch('http://localhost:3777/api/seed', { method: 'POST' });

const pages = [
  { url: '/', name: 'dashboard', full: true },
  { url: '/leads', name: 'leads', full: false },
  { url: '/pipeline', name: 'pipeline', full: false },
  { url: '/outreach', name: 'outreach', full: false },
];

for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3777${p.url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `demo/shots/${p.name}.png`, fullPage: p.full });
  console.log('shot:', p.name);
  await page.close();
}

// 触达页带生成结果的截图（视频分镜参考）
{
  const page = await ctx.newPage();
  await page.goto('http://localhost:3777/outreach', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /生成 \d+ 条文案/ }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'demo/shots/outreach-generated.png' });
  console.log('shot: outreach-generated');
  await page.close();
}

// 线索页带导入报告的截图
{
  const page = await ctx.newPage();
  await page.goto('http://localhost:3777/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const csv = await (await fetch('http://localhost:3777/sample-leads.csv')).text();
  await page.locator('textarea').fill(csv);
  await page.getByRole('button', { name: '导入粘贴内容' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'demo/shots/leads-imported.png' });
  console.log('shot: leads-imported');
  await page.close();
}

// 恢复干净状态
await fetch('http://localhost:3777/api/seed', { method: 'POST' });
await browser.close();
console.log('DONE');

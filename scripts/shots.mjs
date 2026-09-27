// 六视图截图 + 参照稿对照截图：node scripts/shots.mjs
// 依赖本机 http://localhost:3777 已启动。
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
      } catch { /* next */ }
    }
    throw new Error('no usable browser');
  }
}

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });

await fetch('http://localhost:3777/api/seed', { method: 'POST' });

const pages = [
  { url: '/', name: 'v2-dashboard', full: true },
  { url: '/leads', name: 'v2-leads', full: false },
  { url: '/pipeline', name: 'v2-pipeline', full: false },
  { url: '/outreach', name: 'v2-outreach', full: false },
  { url: '/plan', name: 'v2-plan', full: true },
  { url: '/scope', name: 'v2-scope', full: true },
];

for (const p of pages) {
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3777${p.url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `demo/shots/${p.name}.png`, fullPage: p.full });
  console.log('shot:', p.name);
  await page.close();
}

// 抽屉打开态
{
  const page = await ctx.newPage();
  await page.goto('http://localhost:3777/leads', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.locator('tbody tr').first().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'demo/shots/v2-drawer.png' });
  console.log('shot: v2-drawer');
  await page.close();
}

// 参照稿对照（本地文件）
{
  const page = await ctx.newPage();
  await page.goto('file:///D:/Desktop/index.html', { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'demo/shots/ref-dashboard.png', fullPage: true });
  console.log('shot: ref-dashboard');
  await page.close();
}

await fetch('http://localhost:3777/api/seed', { method: 'POST' });
await browser.close();
console.log('DONE');

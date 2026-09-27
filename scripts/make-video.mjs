// 演示视频生成：分节录屏(Playwright) + edge-tts 配音(失败回落 Windows SAPI) + ffmpeg 合成。
// 前置：npm run build && npm run start（http://localhost:3777）。
// 用法：node scripts/make-video.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3777';
const RAW = 'demo/raw';
const OUT = 'demo/onely-recruiter-demo.mp4';
mkdirSync(RAW, { recursive: true });
for (const f of ['tts-test.mp3']) if (existsSync(`${RAW}/${f}`)) rmSync(`${RAW}/${f}`);

const SECTIONS = [
  {
    id: 's1',
    narration:
      '这是 Onely Recruiter，为 Onely 情感陪伴业务三天招募一百名海外运营者的自动化原型。左侧四个模块：数据看板、线索与导入、跟进看板、触达文案。冲刺进行到第三天上午：一百三十四条有效线索，六十一人已入驻，距离一百人的目标还差三十九人；十二条跟进今天到期。看板漏斗按到达过该阶段统计，从新线索到已入驻，每一级转化率实时可见。',
    act: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1600);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(1600);
      await page.mouse.wheel(0, -1600);
      await page.waitForTimeout(600);
    },
  },
  {
    id: 's2',
    narration:
      '先看线索导入。粘贴一份十行的 CSV，线索来自 Telegram 社群、OnlineJobs.ph、Facebook 群组等八个渠道。点击导入，系统做三级去重：一条与库内记录邮箱撞车，一条文件内社媒号大小写撞车，都被拦下并给出命中规则；其余八条入库，并立即完成评分和 A、B、C 分级。全程不需要人工清洗。',
    act: async (page) => {
      await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      const csv = await (await fetch(`${BASE}/sample-leads.csv`)).text();
      await page.locator('textarea').fill(csv);
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: '导入粘贴内容' }).click();
      await page.waitForTimeout(1600);
      await page.locator('.report').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
    },
  },
  {
    id: 's3',
    narration:
      '点开任意一行，是评分明细：美区客户经验加十八、美区班次加十五、平台覆盖、英文样题，逐项列清楚。A 级七十五分以上当天直发 Offer，B 级进备选池滚动补位，C 级淘汰或转内容岗。筛选支持状态、渠道、级别组合，整表可一键导出 CSV。',
    act: async (page) => {
      await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.locator('tbody tr').first().click();
      await page.waitForTimeout(1400);
      await page.locator('select').nth(2).selectOption('A');
      await page.waitForTimeout(1100);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(700);
    },
  },
  {
    id: 's4',
    narration:
      '跟进看板按七个阶段分列。标红的卡片是逾期待跟进：触达后没回复、或发了 Offer 没签的人，系统自动排了 D1 提醒和催签。运营在这里只做两个动作：推进状态、处理逾期。状态一变，时间戳自动写入，漏斗数据就由这些时间戳算出来。',
    act: async (page) => {
      await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1100);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(900);
      await page.locator('.kcol').nth(1).getByRole('button', { name: /→/ }).first().click();
      await page.waitForTimeout(1400);
      await page.mouse.wheel(500, 0);
      await page.waitForTimeout(1000);
    },
  },
  {
    id: 's5',
    narration:
      '触达文案页：选好目标人群、渠道和轮次，一键批量生成个性化文案。模板自动代入姓名、地区和候选人最熟的两个平台；LinkedIn 和 OnlineJobs 是带主题行的长信，社群渠道是短私信。D0 首触、D1 提醒、D2 最后召集，三轮语气各不相同。生成后可逐条复制、一键全部标记已触达；配置中转站后，浏览器还能再润色一遍。',
    act: async (page) => {
      await page.goto(`${BASE}/outreach`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /生成 \d+ 条文案/ }).click();
      await page.waitForTimeout(2000);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1300);
      await page.getByRole('button', { name: '复制' }).first().click();
      await page.waitForTimeout(1300);
    },
  },
  {
    id: 's6',
    narration:
      '最后回到看板：回复率、报名率、Offer 接受率一目了然；三日节奏对照三四、六七、一百的目标线。这套自动化把名单清洗、去重、文案、跟进排期和统计，从二十人团队的活压缩到三个人加一个工具；人只留下样题抽检、A B 边界判断、和在社群里当活人。这就是 Onely Recruiter。',
    act: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1100);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, -2200);
      await page.waitForTimeout(900);
    },
  },
];

function tts(text, outMp3) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync(
        'python',
        ['-m', 'edge_tts', '--voice', 'zh-CN-YunxiNeural', '--rate=-12%', '--text', text, '--write-media', outMp3],
        { stdio: 'pipe' }
      );
      if (existsSync(outMp3)) return outMp3;
    } catch (e) {
      console.log(`edge-tts attempt ${attempt} failed:`, String(e).slice(0, 100));
    }
  }
  const wav = outMp3.replace(/\.mp3$/, '.wav');
  const winPath = wav.replace(/\//g, '\\');
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; try { $s.SelectVoice('Microsoft Huihui Desktop') } catch {}; $s.SetOutputToWaveFile('${winPath}'); $s.Speak('${text.replace(/'/g, '')}'); $s.Dispose()`;
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'pipe' });
  return wav;
}

function durOf(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {
    stdio: 'pipe',
  }).toString();
  return parseFloat(out.trim());
}

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

async function main() {
  // 0. 服务与干净状态
  await fetch(`${BASE}/api/seed`, { method: 'POST' });
  console.log('server ok, seed reset');

  // 1. 配音先行（确定每节时长）
  const audio = [];
  for (const s of SECTIONS) {
    const file = tts(s.narration, `${RAW}/${s.id}.mp3`);
    const d = durOf(file);
    audio.push({ ...s, audioFile: file, dur: d });
    console.log(`tts ${s.id}: ${d.toFixed(1)}s (${file})`);
  }

  // 2. 分节录屏
  const browser = await launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: RAW, size: { width: 1440, height: 900 } },
  });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });

  const recorded = [];
  for (const s of audio) {
    const page = await ctx.newPage();
    const t0 = Date.now();
    await s.act(page);
    const elapsed = Date.now() - t0;
    const pad = Math.max(1200, (s.dur + 1.6) * 1000 - elapsed);
    await page.waitForTimeout(pad);
    const vp = await page.video().path();
    await page.close();
    recorded.push({ ...s, videoFile: vp });
    console.log(`recorded ${s.id}: video=${((Date.now() - t0) / 1000).toFixed(1)}s audio=${s.dur.toFixed(1)}s`);
  }
  await browser.close();

  // 3. 逐节合成（视频轨重编码为 h264，音频 aac，取音频长度收尾）
  const segs = [];
  for (const r of recorded) {
    const seg = `${RAW}/${r.id}.mp4`;
    execFileSync(
      'ffmpeg',
      ['-y', '-i', r.videoFile, '-i', r.audioFile, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2', '-shortest', seg],
      { stdio: 'pipe' }
    );
    segs.push(seg);
    console.log('muxed', seg, durOf(seg).toFixed(1) + 's');
  }

  // 4. 拼接成片（concat 列表内路径相对列表文件解析，必须写绝对路径）
  const list = `${RAW}/concat.txt`;
  writeFileSync(list, segs.map((f) => `file '${path.resolve(f).replace(/\\/g, '/')}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUT], { stdio: 'pipe' });
  console.log('FINAL:', OUT, durOf(OUT).toFixed(1) + 's');

  // 5. 恢复演示数据
  await fetch(`${BASE}/api/seed`, { method: 'POST' });
}

main().catch((e) => {
  console.error('video pipeline failed:', e);
  process.exit(1);
});

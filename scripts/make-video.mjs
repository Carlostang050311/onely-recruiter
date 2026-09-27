// 演示视频生成 v2：六视图分节录屏(Playwright) + edge-tts 配音 + ffmpeg 合成。
// 前置：npm run build && npm run start（http://localhost:3777）。
// 用法：node scripts/make-video.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3777';
const RAW = 'demo/raw';
const OUT = 'demo/onely-recruiter-demo.mp4';
mkdirSync(RAW, { recursive: true });

const SECTIONS = [
  {
    id: 's1',
    narration:
      '这是 Onely 运营招募作战台，为情感陪伴业务三天入驻一百名海外运营者而生的作战控制台。左侧六个视图：作战仪表盘、线索库与分级、跟进看板、触达文案台、三天增长方案、范围与假设。仪表盘六项指标：五十四条有效线索、三十七条已触达、二十二条已回复、十三条通过筛选、七条已入驻、二十九条 S 加 A 高优。转化漏斗、每日入驻节奏、来源与地区分布、能力分级、以及自动化降本测算，全部实时渲染。',
    act: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(1600);
      await page.mouse.wheel(0, 800);
      await page.waitForTimeout(1600);
      await page.mouse.wheel(0, -2400);
      await page.waitForTimeout(700);
    },
  },
  {
    id: 's2',
    narration:
      '线索库与分级。点击导入线索，载入演示 CSV——七行数据里藏着两条重复：一条邮箱大小写和链接尾斜杠不同，一条纯重复记录。点击导入并去重分级：系统按邮箱、主页链接、电话三个键归一化去重，重复记录合并进最早一条并打上合并标记，其余五条入库，并立即完成七维评分与 S A B C 分级。',
    act: async (page) => {
      await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: '导入线索' }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /载入演示 CSV/ }).click();
      await page.waitForTimeout(700);
      await page.getByRole('button', { name: '导入并去重分级' }).click();
      await page.waitForTimeout(1600);
      await page.getByRole('button', { name: '知道了' }).click();
      await page.waitForTimeout(900);
    },
  },
  {
    id: 's3',
    narration:
      '点击任意一行，右侧抽屉打开。评分与资料标签页列出七维评分明细：欧美创作者运营经验二十四分、TikTok 与 Instagram 平台匹配十六分、英语十五、平台评分十五、时区重叠十、每周工时十、AI 工具熟练度十。S 级八十五分以上首批直聊，C 级五十五分以下婉拒。编辑标签页可改资料，保存即自动重新评分。',
    act: async (page) => {
      await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.locator('tbody tr').first().click();
      await page.waitForTimeout(1100);
      await page.getByRole('button', { name: '编辑', exact: true }).click();
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: '评分与资料' }).click();
      await page.waitForTimeout(1000);
    },
  },
  {
    id: 's4',
    narration:
      '跟进看板顶部是待跟进提醒：逾期红色、今日到期金色，点完成跟进就按原渠道发出下一轮跟进文案并重新排期。下方五个阶段的看板加流失列，卡片可以拖拽跨列，也可以用按钮推进；每一次阶段变化都会自动写进跟进动态时间线。',
    act: async (page) => {
      await page.goto(`${BASE}/pipeline`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.locator('.rem-item button').first().click();
      await page.waitForTimeout(1300);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1200);
      await page.locator('.kcol').nth(1).getByRole('button', { name: /推进/ }).first().click();
      await page.waitForTimeout(1200);
    },
  },
  {
    id: 's5',
    narration:
      '触达文案台：左侧六个渠道模板和可点击的变量芯片；右侧选定线索后即时生成个性化文案——模板会按线索的经历信号自动插入个性化钩子，比如这位候选人的九十四分好评和 TikTok 增长经历。点模拟发送并排跟进，系统记录触达并自动排定 D 加 2 轻推；D 加 4 仍无回复则换钩子做最后触达，再无声就转流失。',
    act: async (page) => {
      await page.goto(`${BASE}/outreach`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1100);
      await page.mouse.wheel(0, 300);
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /模拟发送并排跟进/ }).click();
      await page.waitForTimeout(1400);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(900);
    },
  },
  {
    id: 's6',
    narration:
      '三天增长方案页就是作战文档：漏斗数学按转化率反推一千二百条原始线索；十个渠道各有配额与入口；评分模型与硬门槛、红旗清单；三天作战时间轴；以及入驻后的 Discord 总部、Telegram 补位、三天 Bootcamp、留存成长与合规底座。范围与假设页把已实现功能和待验证假设两栏列清，进入真实战役前先小样本校准。',
    act: async (page) => {
      await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(1400);
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(1400);
      await page.goto(`${BASE}/scope`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(1000);
    },
  },
  {
    id: 's7',
    narration:
      '最后回到仪表盘：以一千条有效线索的一期战役为口径，纯人工运营需要二百一十四点六小时，自动化之后十二点五小时，降幅百分之九十四；等效人力从九人降到零点五人。人只保留面试、异常处理、和在社群里当活人。这就是 Onely 运营招募作战台。',
    act: async (page) => {
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(1500);
      await page.mouse.wheel(0, -1600);
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
  await fetch(`${BASE}/api/seed`, { method: 'POST' });
  console.log('server ok, seed reset');

  const audio = [];
  for (const s of SECTIONS) {
    const file = tts(s.narration, `${RAW}/${s.id}.mp3`);
    const d = durOf(file);
    audio.push({ ...s, audioFile: file, dur: d });
    console.log(`tts ${s.id}: ${d.toFixed(1)}s`);
  }

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

  const list = `${RAW}/concat.txt`;
  writeFileSync(list, segs.map((f) => `file '${path.resolve(f).replace(/\\/g, '/')}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUT], { stdio: 'pipe' });
  console.log('FINAL:', OUT, durOf(OUT).toFixed(1) + 's');

  await fetch(`${BASE}/api/seed`, { method: 'POST' });
}

main().catch((e) => {
  console.error('video pipeline failed:', e);
  process.exit(1);
});

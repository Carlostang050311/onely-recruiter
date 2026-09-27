// API 冒烟测试：对已启动的 http://localhost:3777 走一遍核心链路。
// node scripts/smoke.mjs
const BASE = 'http://localhost:3777';
const j = (r) => r.json();

async function main() {
  let fail = 0;
  const check = (name, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
    if (!cond) fail += 1;
  };

  // 1. 重置演示数据
  const seed = await fetch(`${BASE}/api/seed`, { method: 'POST' }).then(j);
  check('seed 重置', seed.ok && seed.leads === 134, `leads=${seed.leads}`);

  // 2. 统计
  const stats = await fetch(`${BASE}/api/stats`).then(j);
  check('stats 漏斗完整', stats.funnel.length === 7);
  check('stats 已入驻=61', stats.totals.onboarded === 61, `onboarded=${stats.totals.onboarded}`);
  check('stats 渠道数=8', stats.byChannel.length === 8, `channels=${stats.byChannel.length}`);
  check('stats 三日节奏', stats.pace.length === 3 && stats.pace.every((d) => d.onboarded >= 0));

  // 3. 导入示例 CSV（含 2 条重复）
  const csv = await (await fetch(`${BASE}/sample-leads.csv`)).text();
  const imp = await fetch(`${BASE}/api/leads/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ csv, filename: 'sample-leads.csv' }),
  }).then(j);
  check('导入去重', imp.totalRows === 10 && imp.inserted === 8 && imp.duplicates.length === 2,
    `rows=${imp.totalRows} inserted=${imp.inserted} dups=${imp.duplicates.length}`);  check('重复命中规则', imp.duplicates.every((d) => ['email', 'handle', 'name_location'].includes(d.matchedKey)),
    imp.duplicates.map((d) => `${d.name}:${d.matchedKey}(${d.against})`).join(', '));
  check('新增即评分', imp.insertedLeads.every((l) => typeof l.score === 'number' && l.tier));

  // 4. 状态推进 + 时间戳
  const first = (await fetch(`${BASE}/api/leads?status=new&sort=score`).then(j)).leads[0];
  const moved = await fetch(`${BASE}/api/leads/${first.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'contacted' }),
  }).then(j);
  check('推进写时间戳', moved.lead.status === 'contacted' && !!moved.lead.contacted_at && !!moved.lead.next_followup_at);

  // 5. 生成文案
  const gen = await fetch(`${BASE}/api/outreach/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids: [first.id, first.id + 1], day: 0 }),
  }).then(j);
  check('文案生成', gen.generated === 2 && gen.messages.every((m) => m.body.length > 50));

  // 6. 导出
  const exp = await fetch(`${BASE}/api/leads/export`).then((r) => r.text());
  check('导出 CSV', exp.startsWith('id,first_name') && exp.split('\r\n').length > 140, `lines=${exp.split('\r\n').length}`);

  // 7. 恢复演示数据（截图/录像前保持干净）
  await fetch(`${BASE}/api/seed`, { method: 'POST' }).then(j);

  console.log(fail === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});

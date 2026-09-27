// API 冒烟测试 v2：对已启动的 http://localhost:3777 走一遍核心链路。
// node scripts/smoke.mjs
const BASE = 'http://localhost:3777';
const j = (r) => r.json();

async function main() {
  let fail = 0;
  const check = (name, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
    if (!cond) fail += 1;
  };

  // 1. 重置演示数据（54 条，漏斗 7/6/9/15/17）
  const seed = await fetch(`${BASE}/api/seed`, { method: 'POST' }).then(j);
  check('seed 重置', seed.ok && seed.leads === 54, `leads=${seed.leads}`);

  // 2. 统计
  const stats = await fetch(`${BASE}/api/stats`).then(j);
  check('stats 漏斗', stats.funnel.onboarded === 7 && stats.funnel.qualified === 13, `onb=${stats.funnel.onboarded} qual=${stats.funnel.qualified}`);
  check('stats 六 KPI', typeof stats.kpi.hot === 'number' && typeof stats.kpi.replyRate === 'number');
  check('stats 降本测算', stats.savings.savedPct === 94, `saved=${stats.savings.savedPct}%`);
  check('stats 每日节奏', stats.daily.plan.join(',') === '30,35,35' && stats.daily.actual.reduce((a, b) => a + b, 0) === 7, `actual=${stats.daily.actual}`);

  // 3. 导入示例 CSV（7 行：2 组重复 → 新增 5 合并 2）
  const csv = await (await fetch(`${BASE}/sample-leads.csv`)).text();
  const imp = await fetch(`${BASE}/api/leads/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ csv, filename: 'sample-leads.csv' }),
  }).then(j);
  check('导入去重合并', imp.total === 7 && imp.nw === 5 && imp.merged === 2 && imp.invalid === 0,
    `total=${imp.total} nw=${imp.nw} merged=${imp.merged} invalid=${imp.invalid}`);

  // 4. 合并标记可见
  const mergedLead = (await fetch(`${BASE}/api/leads?q=Angela`).then(j)).leads[0];
  check('合并标记 dup_count', mergedLead && mergedLead.dup_count >= 1, `dup=${mergedLead?.dup_count} source=${mergedLead?.source}`);

  // 5. 阶段流转
  const fresh = (await fetch(`${BASE}/api/leads?status=new`).then(j)).leads[0];
  const moved = await fetch(`${BASE}/api/leads/${fresh.id}/stage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dir: 1 }),
  }).then(j);
  check('阶段推进', moved.lead.status === 'contacted' && !!moved.lead.next_followup_at, `status=${moved.lead.status}`);

  // 6. 模拟发送 + 跟进序列
  const sent = await fetch(`${BASE}/api/leads/${fresh.id}/message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'email', seq: 0 }),
  }).then(j);
  check('模拟发送', sent.lead.messages.length >= 1 && sent.msg.body.length > 80 && !sent.msg.body.includes('{{'));

  // 7. 批量分级
  const bulk = await fetch(`${BASE}/api/leads/bulk`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'grade' }),
  }).then(j);
  check('批量分级', bulk.n > 0, `n=${bulk.n}`);

  // 8. 新建 + 编辑重评分
  const created = await fetch(`${BASE}/api/leads`, { method: 'POST' }).then(j);
  const edited = await fetch(`${BASE}/api/leads/${created.lead.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ us_years: 4, english: 'native', rating: 95, platforms: 'tiktok,instagram', hours_per_week: 40, timezone_overlap: 5, ai_tools: 1 }),
  }).then(j);
  check('编辑重评分到 S', edited.lead.tier === 'S', `score=${edited.lead.score} tier=${edited.lead.tier}`);

  // 9. 导出
  const exp = await fetch(`${BASE}/api/leads/export`).then((r) => r.text());
  check('导出 CSV 表头', exp.startsWith('id,name,country,city,source,profile_url'), `cols=${exp.split('\r\n')[0].split(',').length}`);

  // 10. 恢复演示数据
  await fetch(`${BASE}/api/seed`, { method: 'POST' }).then(j);

  console.log(fail === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});

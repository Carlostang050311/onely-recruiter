// API 冒烟测试 v3：登录会话 + 核心链路 + 事件 webhook + 样题闭环 + 合规件。
// node scripts/smoke.mjs（需服务已启动）；SMOKE_BASE 可指向部署环境
const BASE = process.env.SMOKE_BASE || 'http://localhost:3777';
let COOKIE = '';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { ...(opts.headers || {}), cookie: COOKIE },
  });
  const sc = res.headers.get('set-cookie');
  if (sc) COOKIE = sc.split(';')[0];
  return res;
}
const j = (r) => r.json();

async function main() {
  let fail = 0;
  const check = (name, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
    if (!cond) fail += 1;
  };

  // 0. 未登录应 401
  const anon = await fetch(`${BASE}/api/leads`);
  check('未登录 401', anon.status === 401);

  // 1. 登录
  const login = await api('/api/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user: 'dev', password: 'onely2026' }),
  }).then(j);
  check('登录 dev/lead', login.ok && login.role === 'lead');

  // 2. seed + stats
  const seed = await api('/api/seed', { method: 'POST' }).then(j);
  check('seed 重置', seed.ok && seed.leads === 54, `leads=${seed.leads}`);
  const stats = await api('/api/stats').then(j);
  check('stats 漏斗', stats.funnel.onboarded === 7, `onb=${stats.funnel.onboarded}`);

  // 3. 导入去重合并
  const csv = await (await fetch(`${BASE}/sample-leads.csv`)).text();
  const imp = await api('/api/leads/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ csv, filename: 'sample-leads.csv' }),
  }).then(j);
  check('导入去重合并', imp.total === 7 && imp.nw === 5 && imp.merged === 2, `nw=${imp.nw} merged=${imp.merged}`);

  // 4. 事件 webhook：reply → replied
  const HOOK = { 'content-type': 'application/json', 'x-webhook-key': 'onely-hook' };
  const target = (await api('/api/leads?status=contacted').then(j)).leads[0];
  const rep = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: HOOK,
    body: JSON.stringify({ type: 'reply', email: target.email, text: 'Yes! How does the payout work?' }),
  }).then(j);
  check('webhook reply→replied(question)', rep.intent === 'question' && rep.status === 'replied', `intent=${rep.intent}`);

  // 5. webhook form quiz≥4 → qualified
  const frm = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: HOOK,
    body: JSON.stringify({ type: 'form', email: target.email, quiz_score: 5 }),
  }).then(j);
  check('webhook form→qualified', frm.status === 'qualified');

  // 6. webhook sign → onboarded
  const sgn = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: HOOK,
    body: JSON.stringify({ type: 'sign', email: target.email }),
  }).then(j);
  check('webhook sign→onboarded', sgn.status === 'onboarded');

  // 7. webhook 拒绝 → lost
  const target2 = (await api('/api/leads?status=contacted').then(j)).leads[0];
  const ref = await fetch(`${BASE}/api/webhook`, {
    method: 'POST',
    headers: HOOK,
    body: JSON.stringify({ type: 'reply', email: target2.email, text: 'Not interested, please stop.' }),
  }).then(j);
  check('webhook reply→lost(refused)', ref.intent === 'refused' && ref.status === 'lost');

  // 8. 样题闭环：发放 → 提交 → 机评 → 人工修正 → 校准
  const cand = (await api('/api/leads?status=replied').then(j)).leads[0];
  const sent = await api(`/api/leads/${cand.id}/sample`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'send' }),
  }).then(j);
  check('样题发放', !!sent.token && sent.url.includes('/sample/'));
  const answers = [
    'hey you, sorry your day was rough — that sounds genuinely exhausting. I am here now though, tell me everything while I finish editing tonight`s post ❤',
    'omg stop, you are the reason I check my own comments haha... btw I saved that meme for you, btw did you eat today?',
    'a private Q&A sounds fun — I have a special link for my closest fans, want me to send it? but first, ask me one question right here xx',
  ];
  const sub = await fetch(`${BASE}/api/webhook/sample`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: sent.token, answers }),
  }).then(j);
  check('样题提交机评', typeof sub.score === 'number' && sub.score >= 60, `score=${sub.score}`);
  await api(`/api/leads/${cand.id}/sample`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'correct', human_score: Math.min(100, sub.score + 5) }),
  });
  const cal = (await api('/api/audit').then(j)).calibration;
  check('校准留痕', cal.n === 1 && cal.meanAbsDelta === 5, `n=${cal.n} Δ=${cal.meanAbsDelta}`);

  // 9. 退订：无效 token 安全 404（有效 token 由服务端 HMAC 生成，候选人经邮件页脚使用）
  const badUnsub = await fetch(`${BASE}/api/unsubscribe?t=deadbeef`);
  check('退订无效 token 404', badUnsub.status === 404);

  // 10. 发送限频与模拟发送
  const sendRes = await api(`/api/leads/${cand.id}/message`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: 'email', seq: 0 }),
  }).then(j);
  check('模拟发送+限频计数', sendRes.send.mode === 'simulated' && sendRes.lead.messages.length >= 1);

  // 11. 留存清理（days=0 清所有 lost）
  const ret = await api('/api/admin/retention', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ days: 0 }),
  }).then(j);
  check('PII 留存执行', typeof ret.anonymized === 'number' && ret.anonymized >= 1, `anonymized=${ret.anonymized}`);

  // 12. 审计有记录
  const aud = (await api('/api/audit').then(j)).audit;
  check('审计日志', aud.length >= 5 && aud.some((a) => a.action.includes('webhook')), `rows=${aud.length}`);

  // 13. operator 角色不能重置（RBAC）
  const opsLogin = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user: 'ops', password: 'onely2026' }),
  });
  const opsCookie = opsLogin.headers.get('set-cookie')?.split(';')[0] ?? '';
  const opsSeed = await fetch(`${BASE}/api/seed`, { method: 'POST', headers: { cookie: opsCookie } });
  check('RBAC operator 禁重置', opsSeed.status === 403);

  // 14. 恢复演示数据
  await api('/api/seed', { method: 'POST' });

  console.log(fail === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${fail})`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});

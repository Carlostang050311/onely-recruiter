'use client';
// 3 天增长方案 —— 内容页（与参照稿作战文档一致）

const CHAN_DATA = [
  { t: 'OnlineJobs.ph', d: '菲律宾最大海外雇主招聘平台。直接浏览 jobseeker 资料（技能、评分、期望薪资），同时发布招聘帖收主动申请；搜索词 "TikTok social media manager"、"Instagram growth"、"creator VA"。', q: '配额 280', u: 'https://www.onlinejobs.ph/jobseekers/jobsearch/6' },
  { t: 'Upwork / Fiverr', d: '按国家（PH/NG）+ 技能筛选自由职业者，重点看 JSS 好评率、总工时、客户评价是否来自欧美创作者；Fiverr 看卖家套餐与评价。', q: '配额 190', u: 'https://www.upwork.com/en-gb/hire/social-media-managers/ph/' },
  { t: 'Facebook 群组', d: 'PH/NG 有大量 VA / SMM 群组（如 Virtual Assistants Philippines、Social Media Managers Philippines、Freelance Nigeria 类群组）。发帖 + 查看成员与群内自荐帖。', q: '配额 230', u: 'https://www.facebook.com/search/groups/?q=virtual%20assistant%20philippines' },
  { t: 'LinkedIn', d: 'People 筛选：职位 social media manager / content manager，地区 Philippines / Nigeria，关键词 TikTok、creator、OnlyFans、agency；看履历与作品链接。', q: '配额 110', u: 'https://www.linkedin.com/search/results/people/?keywords=tiktok%20social%20media%20manager' },
  { t: 'X (Twitter)', d: '尼日利亚 SMM 生态高度活跃。搜索 "social media manager" + "US clients / Upwork"，Bio 含接单链接；推文互动后私信。', q: '配额 110', u: 'https://x.com/search?q=%22social%20media%20manager%22%20US%20clients&f=users' },
  { t: 'Telegram 群 / 频道', d: 'VA 求职广播群、自由职业频道、创作者机构群；发岗位卡 + 一键报名链接，按国家建群。', q: '配额 90', u: 'https://t.me' },
  { t: 'Discord 社区', d: '创作者经济 / agency / freelancer 服务器的 #hire 频道；与社区主合作发布。', q: '配额 50', u: 'https://discord.com' },
  { t: 'Reddit', d: 'r/forhire、r/WorkOnline、r/hiring、r/Philippines、r/Nigeria 发帖与检索自荐帖。', q: '配额 40', u: 'https://www.reddit.com/r/forhire/' },
  { t: '远程人才库 / 本地招聘板', d: 'Himalayas、Remotive 人才库；菲律宾 Kalibrr、尼日利亚 Jobberman 发远程兼职帖。', q: '配额 50', u: 'https://himalayas.app/talent/countries/nigeria/x-twitter-management' },
  { t: '人才内推', d: '已入驻者推荐同行，推荐 1 人并留存满 30 天奖励 $25；S/A 级运营通常有同业圈子。', q: '配额 50', u: '' },
];

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export default function PlanPage() {
  return (
    <>
      <div className="plan-hero">
        <h2>3 天 · 100 名具备美国社媒运营能力的运营入驻</h2>
        <p>
          围绕 Onely 首期情感陪伴业务（角色化创作者账号的内容增长与粉丝关系运营），在菲律宾、尼日利亚等为欧美创作者代管社媒的人群中，以「AI
          采集分级 + 人工只做高价值对话」的方式完成招募。本文同时是增长作战文档，原型工具即按此流程构建。
        </p>
      </div>

      <div className="card section-gap">
        <div className="card-title">漏斗数学 <span className="sub">按各环节转化率反推所需线索量</span></div>
        <div className="funnel-math">
          <div className="fm-step"><div className="fmv num">1,200</div><div className="fml">原始线索</div><div className="fmr">10 渠道并行采集</div></div>
          <div className="fm-step"><div className="fmv num">1,000</div><div className="fml">有效线索</div><div className="fmr">去重 + 有效率 83%</div></div>
          <div className="fm-step"><div className="fmv num">950</div><div className="fml">已触达</div><div className="fmr">触达覆盖 95%</div></div>
          <div className="fm-step"><div className="fmv num">333</div><div className="fml">已回复</div><div className="fmr">回复率 35%</div></div>
          <div className="fm-step"><div className="fmv num">183</div><div className="fml">通过筛选</div><div className="fmr">合格率 55%</div></div>
          <div className="fm-step"><div className="fmv" style={{ color: 'var(--green)' }}>100</div><div className="fml">完成入驻</div><div className="fmr">入驻转化 55%</div></div>
        </div>
        <div className="small muted mt8">每日入驻节奏：Day 1 ≥ 30 人 · Day 2 ≥ 35 人 · Day 3 ≥ 35 人；缺口在 D+5 / D+7 两场加场补齐。</div>
      </div>

      <div className="card section-gap">
        <div className="card-title">线索来源与采集方式</div>
        <div className="grid chan-grid">
          {CHAN_DATA.map((c) => (
            <div className="card chan-card" key={c.t}>
              <div className="chan-ico">{SEARCH_ICON}</div>
              <div>
                <h4>{c.t}</h4>
                <p>{c.d}</p>
                <div className="cq">
                  <b>{c.q}</b>
                  {c.u && <> · <a href={c.u} target="_blank" rel="noreferrer">入口 ↗</a></>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid section-gap" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <div className="card-title">筛选标准（评分模型，满分 100）</div>
          <table className="status-table" style={{ tableLayout: 'auto' }}>
            <tbody>
              <tr><td>美国/欧洲创作者运营经验</td><td className="num">24</td></tr>
              <tr><td>TikTok / Instagram 平台匹配</td><td className="num">16</td></tr>
              <tr><td>英语写作能力</td><td className="num">15</td></tr>
              <tr><td>平台评分 / 历史好评</td><td className="num">15</td></tr>
              <tr><td>与美国时区重叠时长</td><td className="num">10</td></tr>
              <tr><td>每周可投入小时</td><td className="num">10</td></tr>
              <tr><td>AI 工具熟练度</td><td className="num">10</td></tr>
            </tbody>
          </table>
          <div className="small mt8"><b>分级：</b>S ≥85（首批直聊）· A 70–84 · B 55–69（进 waitlist/补训）· C &lt;55（婉拒）</div>
        </div>
        <div className="card">
          <div className="card-title">硬门槛与红旗</div>
          <ul className="feat-li">
            <li><b>硬门槛</b>：≥1 年为欧美创作者/品牌运营社媒的可验证经历</li>
            <li><b>硬门槛</b>：能独立产出 TikTok 或 IG 内容</li>
            <li><b>硬门槛</b>：英语书面流利；每周 ≥15h、美国时区重叠 ≥2h</li>
            <li><b>加分</b>：陪伴/人设账号经验、DM 转化、自带美国客户、可内推</li>
            <li><b>红旗</b>：经历无法验证、要求先付费、群发海投简历</li>
            <li><b>红旗</b>：沟通明显不通、所在地区存在合规/收款限制</li>
          </ul>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">3 天作战时间轴</div>
        <div className="tl">
          <div className="tld">Day 1<br />采集首发</div>
          <div className="tlm"><i /><b /></div>
          <div className="tlc">
            <h4>建库 + 高优先触</h4>
            <p>10 渠道并行采集 1,200 条（脚本 + 2 名采集员）；OnlineJobs.ph / LinkedIn / FB 招聘帖上线；导入去重至 1,000、批量分级；当晚完成 S/A 约 300 人首触；Discord、onboarding bot、报名表单就位。</p>
          </div>
          <div className="tld">Day 2<br />全量筛选</div>
          <div className="tlm"><i /><b /></div>
          <div className="tlc">
            <h4>触达 950 + 当日入驻 35</h4>
            <p>分三个时段（PH 早 / NG 午 / US 晚）发完全量首触，并对首日未回者轻推；回复者交 3 分钟自我介绍视频 + 5 题筛选表，S 级约 15 分钟通话；通过即拉 Discord、发入驻清单。</p>
          </div>
          <div className="tld">Day 3<br />收口开营</div>
          <div className="tlm"><b style={{ background: 'var(--gold)' }} /></div>
          <div className="tlc">
            <h4>补满 100 + Bootcamp 开营</h4>
            <p>D+4 最后触达与内推奖励广播，集中补面试；完成 100 人入驻并开启第 1 期 3 天 bootcamp；未达标者进 waitlist，安排 D+5 / D+7 加场。</p>
          </div>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">入驻后的批量管理、培训与留存</div>
        <div className="grid discord-grid mt8">
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>Discord 作为总部</h4>
            <ul className="feat-li">
              <li><b>频道</b>：#start-here #announcements #training #roleplay-lab #content-lab #payments #wins</li>
              <li><b>Onboarding bot</b>：同意规则→填表单→领 cohort 角色→看视频测验→解锁接单</li>
              <li><b>编制</b>：每 20 人一个 squad，S 级晋升 Squad Lead，带津贴</li>
              <li>24h 未完成清单自动提醒，48h 人工介入</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>Telegram 补位</h4>
            <ul className="feat-li">
              <li>按国家/时区建广播群，适配低带宽地区</li>
              <li>bot 每日发任务卡、收 check-in 与日报</li>
              <li>重要通知 Discord + Telegram 双发</li>
              <li>数据回写 CRM，自动生成出勤看板</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>培训（3 天 Bootcamp）</h4>
            <ul className="feat-li">
              <li>D1 角色设定与 voice bible；D2 AI 内容生产 SOP</li>
              <li>D3 陪伴 DM 话术与合规红线</li>
              <li>Loom 录播 + SOP 文档 + 每日小测 + 结业证</li>
              <li>影子期 3 天：AI 起草、人工审核，抽检 20%</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>留存与成长</h4>
            <ul className="feat-li">
              <li>透明分成看板、每周发薪、首单 7 天内到账</li>
              <li>30/60/90 天里程碑奖金；周明星与排行榜</li>
              <li>晋升路径：operator → lead → account manager</li>
              <li>3 天无 check-in 自动预警，每周脉搏调研</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>合规底座</h4>
            <ul className="feat-li">
              <li>18+ 年龄门 + 轻 KYC + 电子合同（分成/保密/禁发内容）</li>
              <li>禁止内容清单与封号规则、账号与数据归属 Onely</li>
              <li>陪伴话术红线培训，争议对话人工复核</li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>自动化如何降本</h4>
            <ul className="feat-li">
              <li>采集/去重/分级/文案/排期/报表全部自动</li>
              <li>1,000 条线索战役：约 215h → 约 12.5h（<b>降 94%</b>）</li>
              <li>人力 9 人 → 0.5 人；人工只做面试与异常处理</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

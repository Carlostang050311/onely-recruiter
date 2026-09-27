'use client';
// 范围与假设 —— 已实现功能 vs 待验证假设

const DONE: [string, string][] = [
  ['线索导入', 'CSV 文件 / 粘贴导入，表头智能映射（含中文别名），含演示 CSV 与模板下载'],
  ['去重合并', '邮箱（忽略大小写）、主页链接（归一化）、电话（仅数字）三键去重，重复合并到最早一条并出报告'],
  ['筛选分级', '7 维评分模型（100 分）与 S/A/B/C 分级，支持批量分级与抽屉内评分明细'],
  ['个性化文案', '6 个渠道模板 + 按线索经历信号插入个性化钩子 + 可编辑模板与变量插入，支持批量生成'],
  ['触达与跟进', '模拟发送、自动排期 D+2 / D+4 跟进序列、跟进动态时间线、到期与逾期提醒'],
  ['阶段管理', '看板拖拽 / 按钮流转 / 抽屉推进，流失列收纳'],
  ['数据统计', '漏斗、来源、地区、分级、每日节奏、自动化降本测算（ECharts）'],
  ['数据与导出', '服务端 SQLite 持久化、一键重置、按选中/全量 CSV 导出'],
  ['增长文档', '来源、筛选标准、漏斗数学、3 天时间轴、Discord/Telegram 管理与培训留存方案'],
];

const HYPO: [string, string][] = [
  ['渠道供给', '10 个渠道 3 天可实际采集 1,200 条、且有效率 83%'],
  ['转化率', '35% 回复率、55% 合格率、55% 入驻率（行业经验估值，需小样本实测校准）'],
  ['收入吸引力', '$300–800 / 账号 / 月与每周发薪对目标人群的真实吸引力、分成模型'],
  ['社群准入', 'FB / Telegram 具体群组的规模、群规与发帖封号风险'],
  ['文化与合规', '情感陪伴账号在 PH / NG 的接受度、平台与当地法规合规'],
  ['主阵地偏好', 'Discord vs Telegram 作为运营主阵地的偏好与到达率'],
  ['内推机制', '$25 内推奖励（留存 30 天）的实际转化效果'],
  ['内容风险', 'AI 起草内容的质量、平台审核与封号风险'],
  ['发薪通道', 'PH / NG 每周发薪的通道成本、到账时效与税务处理'],
];

export default function ScopePage() {
  return (
    <>
      <div className="card section-gap">
        <div className="card-title">已实现功能（本原型可直接操作）</div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="status-table">
            <colgroup>
              <col style={{ width: 130 }} />
              <col />
            </colgroup>
            <tbody>
              {DONE.map((d) => (
                <tr key={d[0]}>
                  <td><b className="yes">已实现</b> {d[0]}</td>
                  <td className="muted">{d[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">仍需验证的假设（进入真实战役前需小样本测试）</div>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="status-table">
            <colgroup>
              <col style={{ width: 130 }} />
              <col />
            </colgroup>
            <tbody>
              {HYPO.map((h) => (
                <tr key={h[0]}>
                  <td><b className="tbd">待验证</b> {h[0]}</td>
                  <td className="muted">{h[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hint-banner mt16">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={16} height={16}>
            <path d="M12 8v5M12 16h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          建议在 Day1 先以 100 条线索做小样本试跑，用真实回复率校准漏斗，再决定全量发送节奏与渠道配额。
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-title">技术说明与数据声明</div>
        <ul className="feat-li">
          <li><b>技术栈</b>：Next.js 15 + SQLite（node:sqlite）+ ECharts 5 + framer-motion；服务端持久化，多标签共享同一数据</li>
          <li><b>数据边界</b>：预置 54 条线索为虚构样本，不代表真实个人；重置演示数据可随时恢复</li>
          <li><b>生产化缺口</b>：合规采集器 / 多人协作权限与审计 / 真实 LLM 接口 / 邮件与 IM 群发通道及域名预热 / KYC 合同与支付</li>
          <li><b>合规提示</b>：真实采集须遵守各平台服务条款与数据保护法规，群发须控制频率、提供退订，避免账号封禁</li>
        </ul>
      </div>
    </>
  );
}

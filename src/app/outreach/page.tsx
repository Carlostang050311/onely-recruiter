'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Lead } from '../../lib/types';
import { CHANNELS, countryByCode } from '../../lib/types';
import { TEMPLATES, VAR_NAMES, buildMessage } from '../../lib/copy';
import type { Template } from '../../lib/copy';
import Toast from '../../components/Toast';
import { Icon } from '../../components/Icons';

export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<Record<string, Template>>(TEMPLATES);
  const [channel, setChannel] = useState('email');
  const [leadId, setLeadId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads as Lead[]);
        setLeadId((d.leads as Lead[])[0]?.id ?? '');
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const lead = leads.find((l) => l.id === leadId) ?? null;
  const preview = useMemo(() => (lead ? buildMessage(lead, channel, 0, templates) : null), [lead, channel, templates]);

  const editorValue = (t: Template) => (t.subject ? `Subject: ${t.subject}\n\n${t.body}` : t.body);

  function onEditorChange(v: string) {
    setTemplates((prev) => {
      const t = { ...prev[channel] };
      const m = v.match(/^Subject: (.*)\n\n/);
      if (prev[channel].subject || m) {
        t.subject = m ? m[1] : '';
        t.body = v.replace(/^Subject: .*\n\n/, '');
      } else {
        t.body = v;
      }
      return { ...prev, [channel]: t };
    });
  }

  async function simSend() {
    if (!lead) return;
    await fetch(`/api/leads/${lead.id}/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel, seq: 0 }),
    });
    setToast(`${lead.name}：已模拟发送，D+2 自动跟进`);
  }

  return (
    <>
      <div className="hint-banner">
        <Icon name="star" />
        文案由模板变量 + 线索信号自动拼装：渠道不同、语气长度不同；高优线索会插入与其经历匹配的个性化钩子。「模拟发送」会自动记录触达、排定 D+2 跟进。
      </div>

      <div className="grid outreach-grid">
        <div className="card">
          <div className="card-title">渠道模板</div>
          <div className="tpl-list">
            {CHANNELS.map((c) => (
              <button key={c.key} className={`tpl-item${channel === c.key ? ' active' : ''}`} onClick={() => setChannel(c.key)}>
                <div className="tn">{c.label}</div>
                <div className="td">{TEMPLATES[c.key].subject ? '含主题，长文案' : '短文案 DM'}</div>
              </button>
            ))}
          </div>
          <div className="mt16">
            <div className="flab">可用变量（点击插入）</div>
            <div>
              {VAR_NAMES.map((v) => (
                <span
                  key={v}
                  className="var-chip"
                  onClick={() => {
                    setTemplates((prev) => ({
                      ...prev,
                      [channel]: { ...prev[channel], body: prev[channel].body + '{{' + v + '}}' },
                    }));
                  }}
                >
                  {'{{' + v + '}}'}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <select className="field" style={{ minWidth: 260 }} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.tier} · {l.name}（{countryByCode(l.country).flag}）
                </option>
              ))}
            </select>
            <button className="btn btn-sm" onClick={() => setToast('已按最新模板重新生成')}>
              <Icon name="reset" />
              重新生成
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                if (preview) navigator.clipboard.writeText((preview.subject ? preview.subject + '\n\n' : '') + preview.body);
                setToast('文案已复制');
              }}
            >
              <Icon name="copy" />
              复制
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-sm btn-primary" onClick={simSend}>
              <Icon name="send" />
              模拟发送并排跟进
            </button>
          </div>
          <div className="flab">模板正文 · {CHANNELS.find((c) => c.key === channel)?.label}（编辑后即时生效）</div>
          <textarea
            className="field"
            rows={6}
            style={{ width: '100%', marginBottom: 14 }}
            value={editorValue(templates[channel])}
            onChange={(e) => onEditorChange(e.target.value)}
          />
          <div className="flab">为所选线索生成的个性化文案</div>
          <div className="msg-box">
            {preview?.subject && <div className="msg-subject">{preview.subject}</div>}
            {preview?.body}
          </div>
          <div className="mt16">
            <div className="card-title" style={{ marginBottom: 8 }}>跟进序列（自动化规则）</div>
            <ul className="feat-li">
              <li><b>D0 首触</b>：按渠道发送个性化首条，自动记录并排期</li>
              <li><b>D+2 轻推</b>：未回复则换钩子（收入数据 / 岗位真实性证明）</li>
              <li><b>D+4 最后触达</b>：附一键报名链接 + 内推奖励，仍无回复转流失</li>
            </ul>
          </div>
        </div>
      </div>
      <Toast msg={toast} />
    </>
  );
}

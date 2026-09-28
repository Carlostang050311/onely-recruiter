'use client';
// 样题提交公开页（静态模式用查询串传 token：/sample?t=xxx）
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const PROMPTS = [
  'Fan message 1: "hey… rough day tbh. work was awful and I just got home to an empty apartment. anyone there?"',
  'Fan message 2: "your last post made me laugh so hard?? how do you always know what I need to see 😭"',
  'Fan message 3: "would you ever do a private Q&A? I have like ten questions only you could answer"',
];

function SampleInner() {
  const params = useSearchParams();
  const token = params.get('t') ?? '';
  const [answers, setAnswers] = useState(['', '', '']);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit() {
    setState('busy');
    const res = await fetch('/api/webhook/sample', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, answers }),
    });
    const data = (await res.json()) as { score?: number; error?: string };
    if (!res.ok) {
      setState('error');
      setMsg(data.error ?? 'submit failed');
      return;
    }
    setState('done');
    setMsg(`Received — thanks! Our team reviews sample replies within a few hours. (ref score ${data.score})`);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', padding: '48px 20px' }}>
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontSize: 20, marginBottom: 6 }}>Onely operator sample task</h2>
        <p className="small muted" style={{ marginBottom: 16 }}>
          Reply in-character to the three fan messages below, as if you run the creator&apos;s account. 15 minutes, your
          own words. This is paid-work simulation only — no real fans involved.
        </p>
        {PROMPTS.map((p, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div className="flab">{p}</div>
            <textarea
              className="field"
              rows={3}
              style={{ width: '100%' }}
              value={answers[i]}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
            />
          </div>
        ))}
        {state === 'done' ? (
          <div className="hint-banner">{msg}</div>
        ) : (
          <>
            {state === 'error' && <div className="small" style={{ color: 'var(--red)', marginBottom: 8 }}>{msg}</div>}
            <button className="btn btn-primary" onClick={submit} disabled={state === 'busy' || !token}>
              {state === 'busy' ? 'Submitting…' : 'Submit replies'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SamplePage() {
  return (
    <Suspense fallback={null}>
      <SampleInner />
    </Suspense>
  );
}

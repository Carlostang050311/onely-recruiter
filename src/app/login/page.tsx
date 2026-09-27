'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '../../components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user, password: pass }),
    });
    if (!res.ok) {
      setErr('账号或密码不对');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <form onSubmit={submit} className="card" style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark />
          <div>
            <div className="brand-name">Onely</div>
            <div className="brand-sub">Operator Console</div>
          </div>
        </div>
        <div>
          <label className="flab">账号（可留空用默认）</label>
          <input className="field" style={{ width: '100%' }} value={user} onChange={(e) => setUser(e.target.value)} placeholder="dev" />
        </div>
        <div>
          <label className="flab">密码</label>
          <input className="field" type="password" style={{ width: '100%' }} value={pass} onChange={(e) => setPass(e.target.value)} autoFocus />
        </div>
        {err && <div className="small" style={{ color: 'var(--red)' }}>{err}</div>}
        <button className="btn btn-primary" type="submit" style={{ justifyContent: 'center' }}>进入作战台</button>
        <div className="small muted">
          默认演示账号：<b>dev / onely2026</b>（lead 角色）· <b>ops / onely2026</b>（operator 角色）。部署环境可用 USERS /
          SESSION_SECRET 环境变量覆盖；若提示凭据错误说明该环境已自定义账号。
        </div>
      </form>
    </div>
  );
}

// 静态构建：移走 API 路由 → NEXT_PUBLIC_STATIC=1 next build → 移回。
// 用法：node scripts/build-static.mjs
import { execFileSync } from 'node:child_process';
import { renameSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const api = path.join(root, 'src', 'app', 'api');
const stash = path.join(root, 'src', 'app', '_api_disabled');

function toggle(on) {
  if (on && existsSync(api)) renameSync(api, stash);
  if (!on && existsSync(stash)) renameSync(stash, api);
}

toggle(true);
try {
  const bin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(bin, ['run', 'build'], {
    env: { ...process.env, NEXT_PUBLIC_STATIC: '1' },
    stdio: 'inherit',
    cwd: root,
    shell: process.platform === 'win32',
  });
} finally {
  toggle(false);
}
console.log('static build done → out/');

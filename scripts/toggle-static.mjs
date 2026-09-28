// 静态构建开关：output:export 不允许 route handlers，构建前把 src/app/api 移走、构建后移回。
// 用法：node scripts/toggle-static.mjs on|off
import { renameSync, existsSync } from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
const root = process.cwd();
const api = path.join(root, 'src', 'app', 'api');
const stash = path.join(root, 'src', 'app', '_api_disabled');

if (mode === 'on') {
  if (existsSync(api)) renameSync(api, stash);
  console.log('static mode: api routes stashed');
} else if (mode === 'off') {
  if (existsSync(stash)) renameSync(stash, api);
  console.log('server mode: api routes restored');
} else {
  console.error('usage: toggle-static.mjs on|off');
  process.exit(1);
}

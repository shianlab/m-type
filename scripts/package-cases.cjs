'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { digest } = require('./lib/skill-integrity.cjs');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'output/release-cases');
const version = require('../skill/m-type/package.json').version;
try {
  const cases = require('../docs/cases.json').cases;
  for (const c of cases) {
    const dir = path.join(source, c.slug);
    for (const suffix of ['.html', '.json', '-desktop.png', '-mobile.png']) {
      if (!fs.existsSync(path.join(dir, 'M-TYPE-' + c.code + suffix))) throw new Error('请先运行 npm run showcase：案例成品缺失。');
    }
    fs.copyFileSync(path.join(root, 'examples', c.slug + '.json'), path.join(dir, 'input.demo.json'));
  }
  fs.writeFileSync(path.join(source, 'README.txt'), 'M-TYPE 模拟案例集\n\n所有数据与偏好回答均为合成演示信息，非真实账号消费。\n解压后打开各案例中的 HTML，可离线阅读并保存长图。\n各目录包含：HTML、派生报告 JSON、手机 PNG、电脑 PNG 与模拟输入。\n\n仓库：https://github.com/shianlab/m-type\n');
  const archive = path.join(root, 'dist', `m-type-demo-cases-${version}.zip`);
  fs.mkdirSync(path.dirname(archive), { recursive: true });
  const res = spawnSync('python3', [path.join(root, 'scripts/zip-cases.py'), source, archive], { encoding: 'utf8' });
  if (res.error || res.status !== 0) throw new Error(res.error?.message || res.stderr);
  const skill = path.join(root, 'dist', `m-type-${version}.zip`);
  fs.writeFileSync(path.join(root, 'dist/SHA256SUMS'), [skill, archive].map(file => digest(file) + '  ' + path.basename(file)).join('\n') + '\n');
  console.log(JSON.stringify({ status: 'packaged_cases', cases: cases.length, zip: archive, bytes: fs.statSync(archive).size, sha256: digest(archive) }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }

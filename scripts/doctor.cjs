'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const missing = [];
const check = file => { if (!fs.existsSync(path.join(root, file))) missing.push(file); };
for (const file of ['template/index.html', 'template/app.js', 'template/core.js', 'template/report-model.js', 'template/styles.css', 'template/decor.css', 'template/balance.css']) check(file);
check(fs.existsSync(path.join(root, 'vendor/html-to-image.js')) ? 'vendor/html-to-image.js' : 'node_modules/html-to-image/dist/html-to-image.js');
let characters = 0, decorations = 0;
try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/personalities-retro-v1/manifest.json'), 'utf8'));
  characters = new Set(manifest.characters.map(p => p.code)).size;
  for (const p of manifest.characters) check(`assets/personalities-retro-v1/${p.code}.png`);
  const decor = JSON.parse(fs.readFileSync(path.join(root, 'assets/report-decor-v1/manifest.json'), 'utf8'));
  decorations = decor.assets.length;
  for (const item of decor.assets) check('assets/report-decor-v1/' + item.file);
} catch { missing.push('素材清单缺失或无效'); }
let png = 'unavailable';
try {
  const { chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright');
  png = fs.existsSync(process.env.MTYPE_BROWSER_PATH || chromium.executablePath()) ? 'browser_found_not_launched' : 'browser_missing';
} catch { png = 'playwright_missing'; }
const ready = Number(process.versions.node.split('.')[0]) >= 20 && !missing.length && characters === 16 && decorations === 8;
console.log(JSON.stringify({ status: ready ? 'html_ready' : 'not_ready', node: process.versions.node, characters, decorations, missing, png, note: 'PNG 状态仅为依赖检测，实际导出由 render --png 或 export 验证。' }, null, 2));
if (!ready) process.exitCode = 1;

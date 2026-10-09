'use strict';
const path = require('node:path');
const { options, fail } = require('./lib/cli.cjs');
const { exportHTML } = require('./lib/export-report.cjs');
(async () => {
  const args = options(process.argv.slice(2), ['--html', '--out', '--layout']);
  if (args.help) { console.log('node scripts/export.cjs --html dossier.html [--out output] [--layout desktop|mobile|both]'); return; }
  if (!args['--html']) throw new Error('请使用 --html 指定已生成的档案。');
  const png = await exportHTML(args['--html'], args['--out'] || path.dirname(args['--html']), args['--layout'] || 'both');
  console.log(JSON.stringify({ status: 'ready', png }, null, 2));
})().catch(fail);

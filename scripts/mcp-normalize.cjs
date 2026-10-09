'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { options, readInput, fail } = require('./lib/cli.cjs');
const { convert } = require('./lib/mcd-adapter.cjs');
try {
  const args = options(process.argv.slice(2), ['--list', '--details', '--out', '--local-timezone', '--money-unit']);
  if (args.help) console.log('node scripts/mcp-normalize.cjs --list response.json --out normalized.json [--details details-by-id.json] [--local-timezone Asia/Shanghai] [--money-unit CNY-yuan]');
  else {
    if (!args['--list'] || !args['--out']) throw new Error('请指定 --list 和 --out。');
    if ([args['--list'], args['--details']].filter(Boolean).some(p => path.resolve(p) === path.resolve(args['--out']))) throw new Error('转换输出不能覆盖原始响应。');
    const result = convert(readInput(args['--list']), args['--details'] ? readInput(args['--details']) : {}, { localTimeZone: args['--local-timezone'], moneyUnit: args['--money-unit'] });
    fs.mkdirSync(path.dirname(path.resolve(args['--out'])), { recursive: true, mode: 0o700 });
    fs.writeFileSync(args['--out'], JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
    console.log(JSON.stringify({ status: result.provenance.outcome, receivedCount: result.provenance.receivedCount, output: path.resolve(args['--out']) }, null, 2));
  }
} catch (error) { fail(error); }

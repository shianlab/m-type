'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { prepare } = require('../template/report-model.js');
const { options, readInput, fail } = require('./lib/cli.cjs');
try {
  const args = options(process.argv.slice(2), ['--input', '--out']);
  if (args.help) console.log('node scripts/analyze.cjs --input input.json [--out analysis.json]');
  else {
    const result = prepare(readInput(args['--input']));
    const json = JSON.stringify(result, null, 2) + '\n';
    if (args['--out']) {
      if (path.resolve(args['--out']) === path.resolve(args['--input'])) throw new Error('分析输出不能覆盖输入文件。');
      fs.mkdirSync(path.dirname(path.resolve(args['--out'])), { recursive: true });
      fs.writeFileSync(args['--out'], json);
      console.log(JSON.stringify({ status: result.status, output: path.resolve(args['--out']) }));
    } else console.log(json);
  }
} catch (error) { fail(error); }

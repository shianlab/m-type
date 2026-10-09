'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { prepare } = require('../template/report-model.js');
const { options, readInput, fail } = require('./lib/cli.cjs');
function addAnswers(input, answers) {
  const before = prepare(input);
  if (!answers || typeof answers !== 'object' || Array.isArray(answers) || !Object.keys(answers).length) throw new Error('请提供本人实际选择的 answers 对象。');
  const missing = new Set(before.questions.map(q => String(q.index)));
  for (const key of Object.keys(answers)) if (!missing.has(key)) throw new Error('仅能补充当前缺失维度，不能覆盖已有证据或回答。');
  const next = { ...input, answers: { ...(input.answers || {}), ...answers } };
  const result = prepare(next);
  return { input: next, result };
}
if (require.main === module) {
  try {
    const args = options(process.argv.slice(2), ['--input', '--answers', '--out']);
    if (args.help) console.log('node scripts/answer.cjs --input normalized.json --answers answers.json --out answered.json');
    else {
      if (!args['--out']) throw new Error('请指定 --out。');
      if ([args['--input'], args['--answers']].filter(Boolean).some(file => path.resolve(file) === path.resolve(args['--out']))) throw new Error('回答输出不能覆盖输入文件。');
      const { input, result } = addAnswers(readInput(args['--input']), readInput(args['--answers']));
      fs.mkdirSync(path.dirname(path.resolve(args['--out'])), { recursive: true, mode: 0o700 });
      fs.writeFileSync(args['--out'], JSON.stringify(input, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      console.log(JSON.stringify({ status: result.status, questions: result.questions, output: path.resolve(args['--out']) }, null, 2));
    }
  } catch (error) { fail(error); }
}
module.exports = { addAnswers };

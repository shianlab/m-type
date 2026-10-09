'use strict';
const fs = require('node:fs');
function options(argv, allowed) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help') { result.help = true; continue; }
    if (!allowed.includes(key) || result[key] !== undefined || !argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('未知、重复或缺少值的参数：' + key);
    result[key] = argv[++i];
  }
  return result;
}
function readInput(filename) {
  if (!filename) throw new Error('请使用 --input 指定规范化订单 JSON。');
  if (fs.statSync(filename).size > 8 * 1024 * 1024) throw new Error('输入文件不能超过 8 MB。');
  try { return JSON.parse(fs.readFileSync(filename, 'utf8').replace(/^\uFEFF/, '')); }
  catch { throw new Error('输入文件不是有效的 UTF-8 JSON。'); }
}
function fail(error) {
  console.error(JSON.stringify({ status: error.questions ? 'needs_answers' : 'error', message: error.message, questions: error.questions }, null, 2));
  process.exitCode = 1;
}
module.exports = { options, readInput, fail };

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addAnswers } = require('../scripts/answer.cjs');
const { convert } = require('../scripts/lib/mcd-adapter.cjs');
const empty = () => convert({ structuredContent: { success: true, code: 200, data: {} } });
test('无列表问答保留查询来源，部分回答继续，完整回答才 ready', () => {
  const input = empty(), first = addAnswers(input, { 0: 'C', 1: 'S' });
  assert.equal(first.result.status, 'needs_answers');
  assert.deepEqual(first.result.questions.map(q => q.index), [2, 3]);
  const last = addAnswers(first.input, { 2: 'D', 3: 'V' });
  assert.equal(last.result.status, 'ready');
  assert.equal(last.result.report.code, 'CSDV');
  assert.equal(last.result.report.count, 0);
  assert.deepEqual(last.input.provenance, input.provenance);
  assert.deepEqual(last.input.orders, []);
  assert.equal(input.answers, undefined);
});
test('不自动填回答，不接受错误选项或覆盖已有依据', () => {
  for (const answers of [{}, null, [], { 0: 'S' }, { 4: 'C' }]) assert.throws(() => addAnswers(empty(), answers));
  const first = addAnswers(empty(), { 0: 'C' });
  assert.throws(() => addAnswers(first.input, { 0: 'E' }));
  const data = require('../examples/day-researcher.json');
  assert.throws(() => addAnswers(data, { 2: 'N' }));
});

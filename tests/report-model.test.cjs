'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { prepare } = require('../template/report-model.js');
const { renderPersonal, inlineJSON } = require('../scripts/lib/package-report.cjs');
const answers = { 0: 'C', 1: 'S', 2: 'D', 3: 'V' };
function order(i, food = '巨无霸', hour = '12') {
  return { id: 'PRIVATE-ID-' + i, status: 'completed', orderedAt: `2026-09-0${i}T${hour}:30:00+08:00`, items: [{ productName: food, quantity: 1, tags: ['classic'] }], amount: 31415.92, currency: 'CNY', discountAmount: 2, phone: 'PRIVATE-PHONE', address: 'PRIVATE-ADDRESS' };
}
test('成品模型确定性生成且不包含原始订单、身份字段或默认隐藏金额', () => {
  const input = { orders: [order(1)], answers, token: 'PRIVATE-TOKEN' };
  const result = prepare(input);
  assert.deepEqual(result, prepare(input));
  assert.equal(result.report.code, 'CSDV');
  assert.equal(result.status, 'ready');
  assert.equal(Object.hasOwn(result.report, 'amount'), false);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE-|31415|orderedAt|productId/);
});
test('空订单能准确返回缺失维度，补答后历史仍然为空', () => {
  assert.deepEqual(prepare({ orders: [] }).questions.map(q => q.index), [0, 1, 2, 3]);
  const r = prepare({ orders: [], answers });
  assert.equal(r.status, 'ready');
  assert.equal(r.report.count, 0);
  assert.equal(r.report.timeline.length, 0);
  assert.equal(r.report.from, null);
  assert.match(r.copy.summary, /身份来自补充回答/);
});
test('有充分订单证据时，补充回答不能覆盖计算身份', () => {
  const input = { orders: Array.from({ length: 5 }, (_, i) => order(i + 1)), answers: { 0: 'E', 1: 'F', 2: 'N', 3: 'V' } };
  const result = prepare(input);
  assert.equal(result.report.code, 'CSDL');
  assert.ok(result.report.dimensions.every(d => d.source === 'orders'));
});
test('仅返回确实缺失的问题', () => {
  const orders = Array.from({ length: 5 }, (_, i) => order(i + 1));
  orders.forEach(o => delete o.discountAmount);
  assert.deepEqual(prepare({ orders }).questions.map(q => q.index), [1]);
});
test('拒绝非法回答、伪造来源和自定义结论覆盖', () => {
  for (const patch of [{ answers: [] }, { answers: { 0: 'N' } }, { answers: { 4: 'C' } }, { source: 'mcp' }, { schemaVersion: 2 }, { showAmount: 'true' }, { code: 'EFNV' }, { copy: { summary: '假的故事' } }]) {
    assert.throws(() => prepare({ orders: [], ...patch }));
  }
});
test('只在明确开启且金额完整时将合计装入交付数据', () => {
  assert.equal(prepare({ orders: [order(1)], answers, showAmount: true }).report.amount, 31415.92);
  const o = order(1); delete o.amount;
  assert.throws(() => prepare({ orders: [o], answers, showAmount: true }), /不完整/);
});
test('并列餐品与时段的文案如实表达并列', () => {
  const result = prepare({ orders: [order(1, '巨无霸'), order(2, '薯条', '21')], answers });
  assert.match(result.copy.summary, /并列份数最多/);
  assert.match(result.copy.summary, /午间、晚间的订单数并列最多/);
  assert.match(result.copy.timeIntro, /并列/);
  assert.match(result.copy.favoriteNote, /并列第一/);
});
test('单笔记录不宣称反复购买或长期偏好', () => {
  const result = prepare({ orders: [order(1)], answers });
  assert.match(result.copy.summary, /1 次/);
  assert.doesNotMatch(result.copy.summary + result.copy.favoriteCaption, /反复|最常/);
  assert.match(result.copy.timelineCaption, /现有/);
});
test('生成入口在缺少人格答案时停止，并给出可回答的问题', () => {
  assert.throws(() => renderPersonal({ orders: [] }), error => error.questions.length === 4);
});
test('生成 HTML 只嵌入选中角色，移除订单秘密与隐藏金额，无外部脚本', () => {
  const { html, documentData } = renderPersonal({ orders: [order(1)], answers });
  assert.equal(documentData.report.code, 'CSDV');
  assert.doesNotMatch(html, /PRIVATE-|31415\.92|<script src=|<link rel="stylesheet"/);
  const embedded = JSON.parse(html.match(/window\.MTYPE_PERSONALITIES = (.*?);<\/script>/s)[1]);
  assert.deepEqual(embedded.map(p => p.code), ['CSDV']);
  const assets = JSON.parse(html.match(/window\.MTYPE_ASSETS = (.*?);<\/script>/s)[1]);
  assert.equal(Object.hasOwn(assets, 'burger'), true);
  assert.equal(Object.hasOwn(assets, 'cola'), false);
});
test('JSON 安全嵌入不能被餐品名结束 script 标签', () => {
  const hostile = '</script><script>globalThis.PWNED=1</script>';
  assert.doesNotMatch(inlineJSON({ name: hostile }), /</);
  assert.equal(JSON.parse(inlineJSON({ name: hostile })).name, hostile);
  const { html } = renderPersonal({ orders: [order(1, hostile)], answers });
  assert.doesNotMatch(html, /<script>globalThis\.PWNED/);
});

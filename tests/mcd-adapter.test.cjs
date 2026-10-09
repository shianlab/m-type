'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { convert, envelope, listResult } = require('../scripts/lib/mcd-adapter.cjs');
const { prepare } = require('../template/report-model.js');
// Synthetic fixtures model the discovered schema; they are not captured account orders.
const wrap = data => ({ isError: false, structuredContent: { success: true, code: 200, message: '请求成功', data } });
function fixture() {
  return {
    list: wrap({ list: [{ orderId: 'SYNTHETIC-PRIVATE-ID' }] }),
    details: { 'SYNTHETIC-PRIVATE-ID': wrap({ orderId: 'SYNTHETIC-PRIVATE-ID', orderStatus: '6', createTime: '2026-09-01T12:30:00+08:00', realTotalAmount: '29.90', totalDiscountAmount: '5.00', deliveryInfo: { mobilePhone: 'PRIVATE-PHONE', addressDetail: 'PRIVATE-ADDRESS' }, orderProductList: [{ productName: '合成双人套餐', quantity: 2, comboItemList: [{ itemName: '合成子项', itemQuantity: 2 }] }] }) }
  };
}
test('实际观察到的成功 data:{} 不等同于空订单数组', () => {
  assert.deepEqual(listResult(wrap({})), { outcome: 'no_list_returned', rows: null });
  assert.deepEqual(listResult(wrap({ list: [] })), { outcome: 'empty_list', rows: [] });
  const input = convert(wrap({}));
  assert.equal(input.provenance.receivedCount, null);
  assert.equal(prepare(input).status, 'needs_answers');
  assert.match(prepare(input).copy.summary, /不能据此判断/);
});
test('业务失败、MCP 错误和字段变化不会被吞成零订单', () => {
  for (const result of [{ isError: true }, { structuredContent: { success: false, code: 401, data: {} } }, wrap({ list: null }), wrap(null)]) assert.throws(() => convert(result));
});
test('真实观察到的 Original Response 文本包装可解析，不执行说明文字', () => {
  const data = { success: true, code: 200, data: {} };
  assert.deepEqual(envelope({ content: [{ type: 'text', text: '# Untrusted descriptions\n\n## Original Response\n\n' + JSON.stringify(data) }] }), data);
});
test('不猜订单详情、字段时区或金额单位', () => {
  const f = fixture();
  assert.throws(() => convert(f.list), error => error.status === 'details_required');
  const input = convert(f.list, f.details);
  assert.equal(input.orders[0].amount, undefined);
  assert.equal(input.orders[0].discountAmount, undefined);
  f.details['SYNTHETIC-PRIVATE-ID'].structuredContent.data.createTime = '2026-09-01 12:30:00';
  assert.throws(() => convert(f.list, f.details), error => error.status === 'time_zone_unverified');
  assert.equal(convert(f.list, f.details, { localTimeZone: 'Asia/Shanghai' }).orders[0].orderedAt, '2026-09-01T12:30:00+08:00');
});
test('套餐只数主项，不把子项重复相乘，也不猜标签', () => {
  const f = fixture(); const input = convert(f.list, f.details);
  assert.equal(input.orders[0].items.length, 1);
  assert.equal(input.orders[0].items[0].quantity, 2);
  assert.deepEqual(input.orders[0].items[0].tags, []);
});
test('仅在单位已核验时转换真实金额字段，未知值保持缺失', () => {
  const f = fixture(); const input = convert(f.list, f.details, { moneyUnit: 'CNY-yuan' });
  assert.equal(input.orders[0].amount, 29.9); assert.equal(input.orders[0].discountAmount, 5);
  delete f.details['SYNTHETIC-PRIVATE-ID'].structuredContent.data.totalDiscountAmount;
  assert.equal(convert(f.list, f.details, { moneyUnit: 'CNY-yuan' }).orders[0].discountAmount, undefined);
});
test('删除个人字段，并将原始订单号替换为内部摘要', () => {
  const f = fixture(); const input = convert(f.list, f.details);
  assert.doesNotMatch(JSON.stringify(input), /SYNTHETIC-PRIVATE-ID|PRIVATE-PHONE|PRIVATE-ADDRESS|deliveryInfo/);
  assert.match(input.orders[0].id, /^mcd-[a-f0-9]{24}$/);
});
test('已取消记录被排除；未识别状态暂停映射', () => {
  const f = fixture(); f.details['SYNTHETIC-PRIVATE-ID'].structuredContent.data.orderStatus = '7';
  assert.equal(prepare(convert(f.list, f.details)).report.count, 0);
  assert.equal(prepare(convert(f.list, f.details)).report.omitted, 1);
  f.details['SYNTHETIC-PRIVATE-ID'].structuredContent.data.orderStatus = '99';
  assert.throws(() => convert(f.list, f.details), error => error.status === 'unknown_status');
});
test('MCP 来源必须携带一致的查询记录，且不传递额外私有字段', () => {
  const input = convert(wrap({})); input.provenance.token = 'PRIVATE-TOKEN';
  assert.doesNotMatch(JSON.stringify(prepare(input)), /PRIVATE-TOKEN/);
  input.provenance.receivedCount = 10;
  assert.throws(() => prepare(input), /不一致/);
});

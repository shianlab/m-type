'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Ajv = require('ajv');
const { validateTarget, validateCall, errorStatus, structure } = require('../scripts/lib/mcp-guard.cjs');
const validator = new Ajv({ strict: false });
const syntheticSchema = { type: 'object', properties: { cursor: { type: 'string' } }, additionalProperties: false };
test('MCP 只读限制排除创建订单、领券、抽奖与商城交易', () => {
  for (const name of ['create-order', 'cancel-order', 'auto-bind-coupons', 'draw-lottery', 'mall-create-order', 'delivery-query-addresses']) {
    assert.throws(() => validateCall(name, {}, syntheticSchema, validator), /只读/);
  }
});
test('没有真实发现的 Schema 时不能调用订单工具', () => {
  assert.throws(() => validateCall('order-list', {}, null, validator), /先发现/);
});
test('参数按工具定义验证，未知参数不会发送出去', () => {
  assert.doesNotThrow(() => validateCall('order-list', { cursor: 'test' }, syntheticSchema, validator));
  assert.throws(() => validateCall('order-list', { cursor: 123 }, syntheticSchema, validator), /参数不符合/);
  assert.throws(() => validateCall('order-list', { guessedPageNumber: 1 }, syntheticSchema, validator), /参数不符合/);
});
test('凭证请求不接受外部域名、HTTP、端口或 URL 用户信息', () => {
  assert.equal(validateTarget('https://mcp.mcd.cn/').hostname, 'mcp.mcd.cn');
  for (const target of ['http://mcp.mcd.cn', 'https://mcp.mcd.cn.evil.test', 'https://example.com', 'https://mcp.mcd.cn:8443', 'https://user:secret@mcp.mcd.cn']) assert.throws(() => validateTarget(target));
});
test('响应结构摘要不回显字符串、数值或 Token', () => {
  const result = structure({ content: [{ type: 'text', text: JSON.stringify({ orders: [{ phone: 'PRIVATE-PHONE', amount: 999.88, token: 'PRIVATE-TOKEN' }] }) }] });
  const encoded = JSON.stringify(result);
  assert.doesNotMatch(encoded, /PRIVATE|999/);
  assert.match(encoded, /encodedJSON/);
});
test('SDK 错误不回显可能含凭证的原始消息', () => {
  const result = errorStatus(new Error('HTTP 401 Bearer PRIVATE-TOKEN'));
  assert.equal(result.status, 'auth_required');
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
  assert.equal(errorStatus(new Error('HTTP 429')).status, 'rate_limited');
});

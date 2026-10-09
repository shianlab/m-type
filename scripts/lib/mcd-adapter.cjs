'use strict';
const { createHash } = require('node:crypto');
const { normalize } = require('../../template/core.js');

class McdDataError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function envelope(result) {
  if (!result || result.isError) throw new McdDataError('tool_error', 'MCP 工具未成功返回数据。');
  let body = result.structuredContent;
  if (!body) {
    for (const content of result.content || []) {
      if (content.type !== 'text') continue;
      const text = content.text;
      const marker = '## Original Response';
      const candidate = text.includes(marker) ? text.slice(text.lastIndexOf(marker) + marker.length).trim() : text.trim();
      try { body = JSON.parse(candidate); break; } catch {}
    }
  }
  if (!body || typeof body !== 'object') throw new McdDataError('invalid_response', '未取得官方响应对象。');
  if (body.success !== true || body.code !== 200) throw new McdDataError('business_error', '官方业务查询未成功，不能当作空订单。');
  if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) throw new McdDataError('invalid_response', '官方 data 字段缺失或类型改变。');
  return body;
}
function listResult(result) {
  const body = envelope(result);
  if (!Object.hasOwn(body.data, 'list')) return { outcome: 'no_list_returned', rows: null };
  if (!Array.isArray(body.data.list)) throw new McdDataError('invalid_response', '订单列表字段类型改变，暂停自动映射。');
  if (body.data.list.length > 5000) throw new McdDataError('record_limit', '返回超过 5000 条记录，需要明确缩小处理范围。');
  return { outcome: body.data.list.length ? 'records_received' : 'empty_list', rows: body.data.list };
}
function timestamp(value, localTimeZone) {
  if (typeof value !== 'string') throw new McdDataError('invalid_time', '订单时间缺失。');
  let iso = value;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(iso)) {
    if (localTimeZone !== 'Asia/Shanghai') throw new McdDataError('time_zone_unverified', '原始时间不带时区；核验时间口径后才能映射。');
    if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(iso)) throw new McdDataError('invalid_time', '未识别订单时间格式。');
    iso = iso.replace(' ', 'T') + '+08:00';
  }
  if (!Number.isFinite(Date.parse(iso))) throw new McdDataError('invalid_time', '订单时间无效。');
  return iso;
}
function money(value) {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d+(\.\d{1,2})?$/.test(value)) throw new McdDataError('invalid_money', '金额字段格式改变，暂停金额映射。');
  const amount = Number(value);
  if (!Number.isSafeInteger(Math.round(amount * 100))) throw new McdDataError('invalid_money', '金额超出支持范围。');
  return amount;
}
function mapOrder(row, result, options) {
  const detail = envelope(result).data;
  if (!row || typeof row.orderId !== 'string' || detail.orderId !== row.orderId) throw new McdDataError('order_mismatch', '订单列表与详情标识不一致。');
  const states = { '1': 'unpaid', '2': 'paid', '4': 'paid', '6': 'completed', '7': 'cancelled', '8': 'completed', '10': 'paid' };
  const status = states[detail.orderStatus];
  if (!status) throw new McdDataError('unknown_status', '出现未核验的订单状态，暂停自动统计。');
  const id = 'mcd-' + createHash('sha256').update(row.orderId).digest('hex').slice(0, 24);
  if (status === 'cancelled' || status === 'unpaid') return { id, status };
  if (!Array.isArray(detail.orderProductList) || !detail.orderProductList.length) throw new McdDataError('missing_items', '有效订单缺少商品记录。');
  const order = {
    id, status, orderedAt: timestamp(detail.createTime, options.localTimeZone),
    // Count purchased top-level lines; do not infer historical combo quantities or categories.
    items: detail.orderProductList.map(item => ({ productName: item.productName, quantity: item.quantity, tags: [] }))
  };
  if (options.moneyUnit === 'CNY-yuan') {
    const amount = money(detail.realTotalAmount), discountAmount = money(detail.totalDiscountAmount);
    if (amount !== undefined) { order.amount = amount; order.currency = 'CNY'; }
    if (discountAmount !== undefined) order.discountAmount = discountAmount;
  }
  return order;
}
function convert(result, detailsById = {}, options = {}) {
  if (options.localTimeZone != null && options.localTimeZone !== 'Asia/Shanghai') throw new McdDataError('invalid_option', '只支持核验后的 Asia/Shanghai 时间口径。');
  if (options.moneyUnit != null && options.moneyUnit !== 'CNY-yuan') throw new McdDataError('invalid_option', '只支持核验后的人民币元口径。');
  const list = listResult(result);
  const orders = (list.rows || []).map(row => {
    if (!row || typeof row.orderId !== 'string' || !row.orderId) throw new McdDataError('missing_order_id', '列表记录缺少可查询详情的订单标识。');
    if (!Object.hasOwn(detailsById, row.orderId)) throw new McdDataError('details_required', '需要按实际 orderId 补充订单详情后再核验状态与餐品。');
    return mapOrder(row, detailsById[row.orderId], options);
  });
  normalize({ orders });
  const queriedAt = options.queriedAt || new Date().toISOString();
  return {
    schemaVersion: 1, source: 'mcp', showAmount: false, orders,
    provenance: {
      provider: 'mcd', endpoint: 'https://mcp.mcd.cn', queriedAt,
      outcome: list.outcome, receivedCount: list.rows ? list.rows.length : null,
      coverage: 'single-response', itemBasis: 'top-level-lines',
      moneyUnit: options.moneyUnit || 'unverified', localTimeZone: options.localTimeZone || 'explicit-offset-only'
    }
  };
}
module.exports = { McdDataError, envelope, listResult, convert };

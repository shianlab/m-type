'use strict';
const ALLOWED_TOOLS = new Set(['order-list', 'query-order', 'query-meal-detail']);
const ENDPOINT = 'https://mcp.mcd.cn';
function validateTarget(url) {
  const target = new URL(url);
  if (target.origin !== ENDPOINT || target.username || target.password) throw new Error('仅允许连接麦当劳官方 MCP 地址。');
  return target;
}
function validateCall(name, args, schema, validator) {
  if (!ALLOWED_TOOLS.has(name)) throw new Error('该工具不在档案查询的只读范围内。');
  if (!schema) throw new Error('必须先发现官方工具定义，不能猜参数。');
  if (!args || typeof args !== 'object' || Array.isArray(args) || Buffer.byteLength(JSON.stringify(args)) > 65536) throw new Error('工具参数必须是小于 64 KB 的对象。');
  if (Object.keys(args).some(key => !Object.hasOwn(schema.properties || {}, key))) throw new Error('参数不符合已发现定义：包含未声明的字段。');
  const check = validator.compile(schema);
  if (!check(args)) {
    const error = new Error('参数不符合已发现的官方工具定义。');
    error.fields = check.errors.map(({ instancePath, keyword }) => ({ path: instancePath, rule: keyword }));
    throw error;
  }
}
function errorStatus(error) {
  const code = Number(error?.code ?? error?.status);
  const text = String(error?.message || '');
  if (code === 401 || /\b401\b|Unauthorized/i.test(text)) return { status: 'auth_required', message: 'Token 未提供、无效或已过期，请重新在本机填写。' };
  if (code === 403 || /\b403\b|Forbidden/i.test(text)) return { status: 'forbidden', message: '官方服务拒绝了此次访问，请检查账号授权。' };
  if (code === 429 || /\b429\b/.test(text)) return { status: 'rate_limited', message: '官方服务限流，请稍后重试。' };
  return { status: 'connection_error', message: '连接或调用未完成；未回显请求、凭证或原始响应。' };
}
function structure(value, depth = 0) {
  if (value === null) return 'null';
  if (depth > 7) return Array.isArray(value) ? 'array' : typeof value;
  if (Array.isArray(value)) return { type: 'array', length: value.length, sample: value.slice(0, 1).map(item => structure(item, depth + 1)) };
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 60).map(([key, val], index) => [/^[a-zA-Z_][a-zA-Z0-9_]{0,39}$/.test(key) || /^[\u4e00-\u9fff]{1,12}$/.test(key) ? key : '<dynamic-key-' + index + '>', structure(val, depth + 1)]));
  if (typeof value === 'string') {
    if (/^\s*[\[{]/.test(value)) { try { return { encodedJSON: structure(JSON.parse(value), depth + 1) }; } catch {} }
    return 'string';
  }
  return typeof value;
}
module.exports = { ALLOWED_TOOLS, ENDPOINT, validateTarget, validateCall, errorStatus, structure };

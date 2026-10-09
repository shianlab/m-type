import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import Ajv from 'ajv';
import guard from './lib/mcp-guard.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const emit = data => process.stdout.write(JSON.stringify(data) + '\n');
const validator = new Ajv({ strict: false, allErrors: false, validateFormats: false });
let client, token, count = 0, closing = false;
const tools = new Map();
const save = (dir, name, data) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  return file;
};
async function hiddenToken() {
  if (process.env.MCD_MCP_TOKEN) {
    const value = process.env.MCD_MCP_TOKEN.trim();
    delete process.env.MCD_MCP_TOKEN;
    return value;
  }
  if (process.platform !== 'darwin') throw new Error('需要宿主凭证输入或 MCD_MCP_TOKEN 环境变量。');
  emit({ status: 'awaiting_token', message: '请在 macOS 隐藏输入框填写官方 MCP Token；不要发到聊天。' });
  const script = 'text returned of (display dialog "请粘贴你在麦当劳官方平台申请的 MCP Token。\n仅用于本次订单只读联调；关闭程序后不保存。" default answer "" with hidden answer buttons {"取消", "连接"} default button "连接" cancel button "取消" with title "M-TYPE · 连接麦当劳 MCP" giving up after 300)';
  const result = await promisify(execFile)('/usr/bin/osascript', ['-e', script], { timeout: 310000, maxBuffer: 32768 });
  return result.stdout.trim();
}
async function close() {
  if (closing) return;
  closing = true;
  token = undefined;
  try { await client?.close(); } catch {}
}
async function main() {
  token = await hiddenToken();
  if (!token || token.length > 16384 || /\s/.test(token)) { emit({ status: 'auth_required', message: '未收到有效格式的 Token。' }); return; }
  const transport = new StreamableHTTPClientTransport(new URL(guard.ENDPOINT), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
    fetch: async (url, init) => {
      guard.validateTarget(typeof url === 'string' || url instanceof URL ? url : url.url);
      return fetch(url, { ...init, redirect: 'error' });
    }
  });
  client = new Client({ name: 'm-type-readonly-verifier', version: '0.2.0' });
  // Only constant diagnostics are emitted; SDK errors may contain remote response text.
  client.onerror = () => {};
  await client.connect(transport, { timeout: 30000 });
  const privateRoot = path.join(root, '.local/mcp');
  fs.mkdirSync(privateRoot, { recursive: true, mode: 0o700 });
  const dir = fs.mkdtempSync(path.join(privateRoot, 'session-'));
  fs.chmodSync(dir, 0o700);
  let cursor, pages = 0;
  const cursors = new Set();
  do {
    const result = await client.listTools(cursor ? { cursor } : undefined, { timeout: 30000 });
    for (const tool of result.tools) if (guard.ALLOWED_TOOLS.has(tool.name)) tools.set(tool.name, tool);
    cursor = result.nextCursor;
    if (cursor && (cursors.has(cursor) || ++pages >= 20)) throw new Error('工具分页未正常结束。');
    cursors.add(cursor);
  } while (cursor);
  const schemaFile = save(dir, 'tools.json', [...tools.values()]);
  emit({ status: 'tools_discovered', tools: [...tools.keys()], schemaFile, note: '握手与工具发现成功；订单读取尚未验证。' });
  const timer = setTimeout(() => { emit({ status: 'session_expired' }); close().finally(() => process.exit(0)); }, 45 * 60 * 1000);
  timer.unref();
  const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    let command;
    try { command = JSON.parse(line); } catch { emit({ status: 'invalid_command' }); continue; }
    if (command.op === 'close') break;
    if (command.op === 'status') { emit({ status: 'tools_discovered', tools: [...tools.keys()], callCount: count }); continue; }
    if (command.op !== 'call') { emit({ status: 'invalid_command' }); continue; }
    try { guard.validateCall(command.name, command.arguments || {}, tools.get(command.name)?.inputSchema, validator); }
    catch (error) { emit({ status: 'rejected', message: error.message, fields: error.fields }); continue; }
    if (count >= 80) { emit({ status: 'call_limit', message: '本次联调已达到 80 次调用上限。' }); break; }
    try {
      count++;
      const result = await client.callTool({ name: command.name, arguments: command.arguments || {} }, undefined, { timeout: 30000 });
      const resultFile = save(dir, `${String(count).padStart(3, '0')}-${command.name}.json`, result);
      emit({ status: result.isError ? 'tool_error' : 'tool_result', name: command.name, resultFile, structure: guard.structure(result) });
    } catch (error) { emit(guard.errorStatus(error)); }
  }
  clearTimeout(timer);
  lines.close();
  await close();
  emit({ status: 'closed' });
}
process.once('SIGINT', () => close().finally(() => process.exit(0)));
process.once('SIGTERM', () => close().finally(() => process.exit(0)));
main().catch(async error => { emit(client ? guard.errorStatus(error) : { status: 'auth_required', message: '尚未填写 Token、已取消或输入等待超时。重新运行即可继续。' }); process.exitCode = 1; await close(); });

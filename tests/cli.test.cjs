'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function temp(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtype-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
function run(script, args, env = {}) { return spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 30000 }); }
test('命令行缺少回答时列出问题且不产出空壳 HTML', t => {
  const dir = temp(t), out = path.join(dir, 'result');
  const r = run('render.cjs', ['--input', 'examples/needs-answers.json', '--out', out]);
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stderr).questions.length, 4);
  assert.equal(fs.existsSync(out), false);
});
test('输入解析错误不会把文件里的秘密片段打印出来', t => {
  const file = path.join(temp(t), 'broken.json'); fs.writeFileSync(file, '{ "token": "DO-NOT-ECHO-THIS", wrong }');
  const r = run('analyze.cjs', ['--input', file]);
  assert.equal(r.status, 1); assert.doesNotMatch(r.stderr, /DO-NOT-ECHO/);
});
test('独立分析命令返回确定人格与事实文案', () => {
  const r = run('analyze.cjs', ['--input', 'examples/day-researcher.json']);
  assert.equal(r.status, 0);
  const data = JSON.parse(r.stdout);
  assert.equal(data.report.code, 'CSDV'); assert.equal(data.report.count, 10); assert.equal(data.report.night, 2);
  assert.match(data.copy.summary, /10 次/);
});
test('浏览器不可用时保留 HTML，返回明确的部分完成状态', t => {
  const dir = temp(t);
  const r = run('render.cjs', ['--input', 'examples/day-researcher.json', '--out', dir, '--png', 'desktop'], { MTYPE_BROWSER_PATH: path.join(dir, 'nonexistent-browser') });
  assert.equal(r.status, 2);
  const data = JSON.parse(r.stdout);
  assert.equal(data.status, 'html_ready_png_failed');
  assert.ok(fs.statSync(data.html).size > 1000);
  assert.deepEqual(data.png, []);
});
test('拒绝将分析结果覆盖到原始输入', t => {
  const file = path.join(temp(t), 'input.json');
  const original = fs.readFileSync(path.join(root, 'examples/day-researcher.json'), 'utf8'); fs.writeFileSync(file, original);
  const r = run('analyze.cjs', ['--input', file, '--out', file]);
  assert.equal(r.status, 1); assert.equal(fs.readFileSync(file, 'utf8'), original);
});

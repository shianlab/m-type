'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { digest, verify } = require('./lib/skill-integrity.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright');
const version = require('../skill/m-type/package.json').version;
const checks = [];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtype-skill-'));
const env = { ...process.env };
delete env.NODE_PATH; delete env.MTYPE_PLAYWRIGHT_PATH; delete env.MTYPE_BROWSER_PATH;
function run(cwd, script, args = [], extraEnv = {}, expected = 0) {
  const res = spawnSync(process.execPath, [path.join(cwd, 'scripts', script), ...args], { cwd: dir, env: { ...env, ...extraEnv }, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(res.status, expected, res.stderr || res.stdout);
  return JSON.parse(expected === 1 ? res.stderr : res.stdout);
}
const write = (name, data) => { const file = path.join(dir, name); fs.writeFileSync(file, JSON.stringify(data)); return file; };
(async () => {
  let browser;
  try {
    const archive = path.join(root, 'dist', `m-type-${version}.zip`);
    const checksumLines = fs.readFileSync(path.join(root, 'dist/SHA256SUMS'), 'utf8').trim().split(/\r?\n/);
    assert.equal(checksumLines.find(line => line.endsWith('  ' + path.basename(archive))), digest(archive) + '  ' + path.basename(archive));
    const unzip = spawnSync('python3', ['-c', [
      'import pathlib, stat, sys, zipfile',
      'with zipfile.ZipFile(sys.argv[1]) as z:',
      ' for i in z.infolist():',
      '  p=pathlib.PurePosixPath(i.filename)',
      '  assert p.parts[0]=="m-type" and not p.is_absolute() and ".." not in p.parts',
      '  assert not stat.S_ISLNK(i.external_attr >> 16)',
      '  assert not any(x.startswith("._") or x in (".local",".env","node_modules","output") for x in p.parts)',
      ' z.extractall(sys.argv[2])'
    ].join('\n'), archive, dir], { encoding: 'utf8' });
    assert.equal(unzip.status, 0, unzip.stderr);
    const unpacked = path.join(dir, 'm-type');
    verify(unpacked); checks.push('ZIP checksum, safe paths, exact file integrity, no private directories');
    const parent = path.join(dir, 'isolated skills with spaces');
    const installed = run(unpacked, 'install-skill.cjs', ['--source', unpacked, '--target', parent]);
    assert.equal(installed.status, 'installed_files');
    const skill = installed.path;
    assert.equal(run(unpacked, 'install-skill.cjs', ['--source', unpacked, '--target', parent]).status, 'already_installed');
    const marker = path.join(parent, 'other-skill.txt'); fs.writeFileSync(marker, 'KEEP');
    fs.appendFileSync(path.join(skill, 'SKILL.md'), '\nLOCAL CHANGE');
    assert.match(run(unpacked, 'install-skill.cjs', ['--source', unpacked, '--target', parent], {}, 1).message, /未覆盖/);
    assert.match(fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8'), /LOCAL CHANGE$/);
    fs.copyFileSync(path.join(unpacked, 'SKILL.md'), path.join(skill, 'SKILL.md'));
    assert.equal(fs.readFileSync(marker, 'utf8'), 'KEEP');
    const damaged = path.join(unpacked, 'assets/personalities-retro-v1/CSDV.png');
    fs.renameSync(damaged, damaged + '.moved');
    assert.throws(() => verify(unpacked), /缺失|清单外/);
    fs.renameSync(damaged + '.moved', damaged);
    checks.push('isolated install, repeat install, existing edits preserved, missing asset rejected');
    const doctor = run(skill, 'doctor.cjs');
    assert.equal(doctor.status, 'html_ready'); assert.equal(doctor.characters, 16); assert.equal(doctor.decorations, 8);
    assert.equal(doctor.png, 'playwright_missing'); assert.equal(fs.existsSync(path.join(skill, 'node_modules')), false);
    const demo = run(skill, 'render.cjs', ['--input', path.join(skill, 'examples/day-researcher.json'), '--out', path.join(dir, 'demo')]);
    assert.equal(demo.code, 'CSDV');
    checks.push('HTML generation outside repository without node_modules, 16 roles and 8 decorations');
    const raw = write('no-list.json', { structuredContent: { success: true, code: 200, data: {} } });
    const normalized = path.join(dir, 'normalized.json');
    assert.equal(run(skill, 'mcp-normalize.cjs', ['--list', raw, '--out', normalized]).status, 'no_list_returned');
    const analysis = run(skill, 'analyze.cjs', ['--input', normalized]);
    assert.equal(analysis.status, 'needs_answers'); assert.equal(analysis.questions.length, 4);
    const blocked = path.join(dir, 'blocked');
    assert.equal(run(skill, 'render.cjs', ['--input', normalized, '--out', blocked], {}, 1).status, 'needs_answers');
    assert.equal(fs.existsSync(blocked), false);
    const partial = path.join(dir, 'partial.json');
    assert.equal(run(skill, 'answer.cjs', ['--input', normalized, '--answers', write('a1.json', { 0: 'C', 1: 'S' }), '--out', partial]).status, 'needs_answers');
    const answered = path.join(dir, 'answered.json');
    assert.equal(run(skill, 'answer.cjs', ['--input', partial, '--answers', write('a2.json', { 2: 'D', 3: 'V' }), '--out', answered]).status, 'ready');
    // These are synthetic fixture answers, never answers on behalf of the real account owner.
    const report = run(skill, 'render.cjs', ['--input', answered, '--out', path.join(dir, 'empty')]);
    const model = JSON.parse(fs.readFileSync(report.data));
    assert.equal(model.report.count, 0); assert.equal(model.provenance.receivedCount, null);
    assert.equal(model.report.code, 'CSDV'); assert.match(model.copy.summary, /不能据此判断.*为零/);
    const failedRaw = write('failed.json', { structuredContent: { success: false, code: 401, data: {} } });
    const failedOut = path.join(dir, 'must-not-exist.json');
    assert.equal(run(skill, 'mcp-normalize.cjs', ['--list', failedRaw, '--out', failedOut], {}, 1).status, 'error');
    assert.equal(fs.existsSync(failedOut), false);
    checks.push('MCP failure vs no-list, questions required, partial answers resume, history stays empty');
    run(skill, 'export.cjs', ['--html', report.html, '--out', path.join(dir, 'empty'), '--layout', 'both'], {
      MTYPE_PLAYWRIGHT_PATH: process.env.MTYPE_PLAYWRIGHT_PATH || path.join(root, 'node_modules/playwright'),
      ...(process.env.MTYPE_BROWSER_PATH ? { MTYPE_BROWSER_PATH: process.env.MTYPE_BROWSER_PATH } : {})
    });
    for (const name of ['desktop', 'mobile']) {
      const png = fs.readFileSync(path.join(dir, 'empty', `M-TYPE-CSDV-${name}.png`));
      assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(png.readUInt32BE(16), name === 'desktop' ? 1800 : 1086);
    }
    browser = await chromium.launch({ headless: true, executablePath: process.env.MTYPE_BROWSER_PATH || undefined });
    const page = await browser.newPage(); const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => { network.push(route.request().url()); return route.abort(); });
    for (const [file, source] of [[demo.html, 'demo'], [report.html, 'mcp']]) {
      await page.goto(pathToFileURL(file).href);
      await page.locator('#characterImage').evaluate(img => img.decode());
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      assert.equal(await page.evaluate(() => window.MTYPE_DOCUMENT.source), source);
    }
    assert.deepEqual(errors, []); assert.deepEqual(network, []);
    checks.push('offline mobile/desktop PNG, 320/390/1280 layouts, correct source, no network requests');
    const evidence = { version, zipSha256: digest(archive), verifiedAt: new Date().toISOString(), checks, clientNativeIntegration: 'pending_phase_4', nonemptyRealOrders: 'pending', fixtureData: 'synthetic_only', playwright: 'reused host dependency via documented environment path' };
    const out = path.join(root, 'output/phase3'); fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'package-verification.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally { if (browser) await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

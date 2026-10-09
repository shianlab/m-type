'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright');
const { renderPersonal } = require('./lib/package-report.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/phase1');
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const cases = [['day-researcher', 'CSDV', 10], ['night-guardian', 'CSNL', 24], ['empty-with-answers', 'EFNV', 0]];
  for (const [name, code] of cases) {
    const args = ['scripts/render.cjs', '--input', `examples/${name}.json`, '--out', `output/phase1/${name}`];
    if (name !== 'empty-with-answers') args.push('--png', 'both');
    const result = JSON.parse(execFileSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 180000 }));
    assert.equal(result.status, 'ready'); assert.equal(result.code, code);
    for (const filename of result.png) {
      const png = fs.readFileSync(filename);
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.readUInt32BE(16), filename.endsWith('-desktop.png') ? 1800 : 1086);
      assert.ok(png.readUInt32BE(20) > 1000);
    }
    console.log('PASS generated ' + name + ' (' + code + ')');
  }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MTYPE_BROWSER_PATH || undefined });
  const scratch = fs.mkdtempSync(path.join(output, '.qa-'));
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const external = [], errors = [];
    await context.route(/^https?:\/\//, route => { external.push(route.request().url()); return route.abort(); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const [name, code, count] of cases) {
      await page.goto(pathToFileURL(path.join(output, name, `M-TYPE-${code}.html`)).href);
      await page.locator('#characterImage').evaluate(image => image.decode());
      assert.equal(await page.locator('.type-code').textContent(), code);
      assert.equal(await page.evaluate(() => MTypeApp.getReport().count), count);
      assert.equal(await page.evaluate(() => MTYPE_PERSONALITIES.length), 1);
      assert.equal(await page.locator('#galleryButton').isVisible(), false);
      assert.equal(await page.locator('label[for="importFile"]').isVisible(), false);
      assert.equal(await page.locator('#resetDemo').isVisible(), false);
      assert.equal(await page.locator('#exportButton').isEnabled(), true);
      assert.match(await page.locator('.folio-meta').textContent(), /演示/);
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' overflow at ' + width);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(output, name, 'mobile-preview.png'), fullPage: true });
    }
    // Every persona can be packaged independently and decoded at narrow mobile width.
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/personalities-retro-v1/manifest.json')));
    const scratchHTML = path.join(scratch, 'report.html');
    for (const { code, name } of manifest.characters) {
      const { html } = renderPersonal({ orders: [], answers: Object.fromEntries([...code].map((letter, i) => [i, letter])) });
      fs.writeFileSync(scratchHTML, html);
      await page.goto(pathToFileURL(scratchHTML).href);
      await page.locator('#characterImage').evaluate(image => image.decode());
      assert.equal(await page.locator('.type-code').textContent(), code);
      assert.equal(await page.locator('.hero h1').textContent(), name);
      assert.equal(await page.locator('.moment').count(), 0);
    }
    const hostile = '</script><script>window.PWNED=1</script>';
    const input = { orders: [{ id: 'PRIVATE-ID', status: 'completed', orderedAt: '2026-09-01T12:00:00+08:00', amount: 12345.67, currency: 'CNY', address: 'PRIVATE-ADDRESS', items: [{ productName: hostile, quantity: 1 }] }], answers: { 0: 'C', 1: 'S', 2: 'D', 3: 'V' } };
    const generated = renderPersonal(input);
    assert.doesNotMatch(generated.html, /PRIVATE-ID|PRIVATE-ADDRESS|12345\.67/);
    fs.writeFileSync(scratchHTML, generated.html);
    await page.goto(pathToFileURL(scratchHTML).href);
    assert.equal(await page.evaluate(() => window.PWNED), undefined);
    assert.equal(await page.locator('.favorite h3').textContent(), hostile);
    assert.equal(await page.locator('.stat').count(), 3);
    assert.match(await page.locator('.folio-meta').textContent(), /导入/);
    input.showAmount = true;
    fs.writeFileSync(scratchHTML, renderPersonal(input).html);
    await page.goto(pathToFileURL(scratchHTML).href);
    assert.equal(await page.locator('.stat').count(), 4);
    assert.match(await page.locator('.stats').textContent(), /12345\.67/);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log('PASS: fixed template / 16 individual personas / responsive / no orders / safe inline data / hidden money / offline exports');
  } finally {
    await browser.close();
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

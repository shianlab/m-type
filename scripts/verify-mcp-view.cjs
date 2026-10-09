'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright');
const { convert } = require('./lib/mcd-adapter.cjs');
const { renderPersonal } = require('./lib/package-report.cjs');
// Synthetic responses only. Remove all generated test artifacts on completion.
const wrap = data => ({ isError: false, structuredContent: { success: true, code: 200, data } });
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mtype-mcp-view-'));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MTYPE_BROWSER_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => route.abort());
    for (const [data, outcome] of [[{}, 'no_list_returned'], [{ list: [] }, 'empty_list']]) {
      const input = convert(wrap(data)); input.answers = { 0: 'C', 1: 'S', 2: 'D', 3: 'V' };
      const file = path.join(dir, outcome + '.html'); fs.writeFileSync(file, renderPersonal(input).html);
      await page.goto(pathToFileURL(file).href);
      await page.locator('#characterImage').evaluate(image => image.decode());
      assert.match(await page.locator('#sourcePill').textContent(), /麦当劳 MCP/);
      assert.equal(await page.locator('.moment').count(), 0);
      assert.equal(await page.locator('.data-duo').count(), 0);
      assert.match(await page.locator('.stats').textContent(), /笔有效记录/);
      assert.doesNotMatch(await page.locator('.report-footer').textContent(), /演示数据/);
      if (outcome === 'no_list_returned') {
        assert.match(await page.locator('.story').textContent(), /不能据此判断.*为零/);
        assert.match(await page.locator('.report-footer').textContent(), /不代表历史订单为零/);
        const png = await page.evaluate(() => MTypeApp.exportReport(false));
        assert.ok(png.startsWith('data:image/png;base64,'));
      } else assert.match(await page.locator('.story').textContent(), /空列表/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: MCP no-list vs empty-list labels / no invented history / responsive / offline PNG');
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });

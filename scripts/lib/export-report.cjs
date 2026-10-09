'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function exportHTML(filename, dir, layout = 'both') {
  if (!['desktop', 'mobile', 'both'].includes(layout)) throw new Error('导出布局仅支持 desktop、mobile 或 both。');
  let chromium;
  try { ({ chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright')); }
  catch { throw new Error('自动导出需要 Playwright。请安装项目开发依赖和 Chromium 浏览器。'); }
  let browser;
  try { browser = await chromium.launch({ headless: true, executablePath: process.env.MTYPE_BROWSER_PATH || undefined }); }
  catch { throw new Error('未能启动 Chromium。请运行 npx playwright install chromium，或通过 MTYPE_BROWSER_PATH 指定可用浏览器。'); }
  const results = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await context.route(/^https?:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(filename)).href);
    await page.waitForFunction(() => window.MTypeApp?.getReport()?.code, null, { timeout: 15000 });
    for (const variant of layout === 'both' ? ['desktop', 'mobile'] : [layout]) {
      await page.setViewportSize(variant === 'desktop' ? { width: 1280, height: 900 } : { width: 390, height: 844 });
      const png = await page.evaluate(() => window.MTypeApp.exportReport(false));
      if (errors.length) throw new Error('页面运行错误：' + errors.join('；'));
      if (!png.startsWith('data:image/png;base64,')) throw new Error('浏览器未生成有效 PNG。');
      fs.mkdirSync(dir, { recursive: true });
      const output = path.join(path.resolve(dir), path.basename(filename, '.html') + '-' + variant + '.png');
      fs.writeFileSync(output, Buffer.from(png.split(',')[1], 'base64'));
      results.push(output);
    }
    return results;
  } finally { await browser.close(); }
}
module.exports = { exportHTML };

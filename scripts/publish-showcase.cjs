'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.MTYPE_PLAYWRIGHT_PATH || 'playwright');
const { renderPersonal } = require('./lib/package-report.cjs');
const { exportHTML } = require('./lib/export-report.cjs');
const root = path.resolve(__dirname, '..');
const manifest = require('../assets/personalities-retro-v1/manifest.json');
const out = path.join(root, 'output/release-cases');
const images = path.join(root, 'docs/images');
const visualsOnly = process.argv.includes('--visuals-only');
const uri = file => pathToFileURL(path.join(root, file)).href;
const role = code => uri(`assets/personalities-retro-v1/${code}.png`);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cases = [
  { slug: 'night-guardian', code: 'CSNL', title: '深夜经典守护者', caption: '熟悉的那一口，是晚归时的小小靠山。', scenario: '经典偏爱 / 优惠优先 / 夜间出没 / 固定复购' },
  { slug: 'day-researcher', code: 'CSDV', title: '白日菜单研究员', caption: '把熟悉的菜单，吃出更多排列组合。', scenario: '经典偏爱 / 优惠优先 / 白日出没 / 多样菜单' },
  { slug: 'sunshine-explorer', code: 'EFDV', title: '全能麦门体验官', caption: '每个没尝过的新口味，都值得一次登场。', scenario: '新品偏爱 / 随心选择 / 白日出没 / 多样菜单' },
  { slug: 'empty-with-answers', code: 'EFNV', title: '午夜麦门探索者', caption: '先收下你的麦门身份，让下一口写下故事。', scenario: '无消费记录 / 人格来自问答 / 时光档案留白' }
];
const stylesheet = `
*{box-sizing:border-box}body{margin:0;background:#f6e6c2;color:#3b1a10;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif} .board{position:relative;overflow:hidden;background:#fff1d4 url('${uri('assets/report-decor-v1/paper-collage.png')}') center/cover}.board:after{position:absolute;inset:14px;border:1px solid #a76f3860;content:"";pointer-events:none}.kicker{font:600 13px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase}.red{color:#cb2419}.mast{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #8c5d3355;padding-bottom:20px}.brand{font-weight:900;font-size:44px;line-height:.9;letter-spacing:-2px}.brand small{display:block;font-size:12px;letter-spacing:9px;margin-top:12px}.tag{font:12px Arial,sans-serif;letter-spacing:2px}.stamp{display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px double #cb2419;border-radius:100%;color:#cb2419;transform:rotate(-14deg)}.ribbon{background:#cc291c;color:#fff1d4;padding:18px 36px;display:flex;justify-content:space-between;align-items:center;font:600 12px Arial,sans-serif;letter-spacing:2px}.paper-chip{padding:8px 12px;background:#f9c74b;border-radius:4px;font-size:13px}.inkline{border-top:1px solid #8c5d3355}.title{font-weight:900;letter-spacing:-2px}.tiny{font:12px Arial,sans-serif;letter-spacing:1px}
`;
const document = body => `<!doctype html><html lang="zh-CN"><meta charset="UTF-8"><style>${stylesheet}</style><body>${body}</body></html>`;
async function renderBoard(page, name, width, height, body) {
  await page.setViewportSize({ width, height });
  await page.setContent(document(body));
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });
  await page.screenshot({ path: path.join(images, name), type: 'png' });
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); fs.mkdirSync(images, { recursive: true });
  const evidence = [];
  for (const item of cases) {
    const input = require('../examples/' + item.slug + '.json');
    const { html, documentData } = renderPersonal(input);
    if (documentData.source !== 'demo' || documentData.report.code !== item.code) throw new Error('案例来源或人格与数据不一致：' + item.slug);
    const dir = path.join(out, item.slug); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `M-TYPE-${item.code}.html`);
    if (!visualsOnly) {
      fs.writeFileSync(file, html); fs.writeFileSync(path.join(dir, `M-TYPE-${item.code}.json`), JSON.stringify(documentData, null, 2) + '\n');
      await exportHTML(file, dir, 'both');
      fs.copyFileSync(path.join(dir, `M-TYPE-${item.code}-mobile.png`), path.join(images, item.slug + '-mobile.png'));
    }
    item.report = documentData.report; item.html = file;
    evidence.push({ slug: item.slug, code: item.code, source: 'demo', count: item.report.count, uniqueFoods: item.report.uniqueFoods, day: item.report.day, night: item.report.night, from: item.report.from, to: item.report.to, personaSource: item.report.dimensions.map(d => d.source) });
    console.log('Rendered case: ' + item.slug + ' / ' + item.code);
  }
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MTYPE_BROWSER_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    const errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:\/\//, r => { requests.push(r.request().url()); return r.abort(); });
    for (const item of cases) {
      await page.goto(pathToFileURL(item.html).href);
      await page.locator('#characterImage').evaluate(img => img.decode());
      await page.locator('.hero').screenshot({ path: path.join(images, item.slug + '-hero.png') });
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('案例横向溢出：' + item.slug);
      }
      if (await page.evaluate(() => window.MTYPE_DOCUMENT.source) !== 'demo') throw new Error('案例丢失演示标记');
    }
    await renderBoard(page, 'cover.png', 1440, 840, `<div class="board" style="width:1440px;height:840px;padding:46px 56px">
      <div class="mast"><div class="brand">M-TYPE<small>麦门人格档案</small></div><div class="kicker">THE HAPPY LITTLE ARCHIVE<br><span style="display:block;margin-top:10px;color:#a27647">PERSONALITY × MEMORIES</span></div><div class="tag">VOL. 01 &nbsp; / &nbsp; THE RETRO COLLECTION</div></div>
      <div style="position:absolute;width:750px;height:750px;background:#ffd24f;border-radius:100%;right:-125px;top:112px;opacity:.85"></div>
      <div style="position:relative;margin-top:58px;width:580px"><div class="red" style="font-size:22px;font-style:italic">把你喜欢的那一口，存成一份档案。</div><div class="title" style="font-size:83px;line-height:1.2;margin:26px 0 24px">你的快乐，<br>自成<span class="red">一型。</span></div><div style="font-size:21px;line-height:1.8">16 个复古角色，遇见你的麦门人格。<br>一份时光档案，把小小快乐慢慢收好。</div><div style="display:flex;gap:10px;margin-top:32px"><span class="paper-chip">16 PERSONALITIES</span><span class="paper-chip">MCP → HTML</span><span class="paper-chip">SAVE AS PNG</span></div></div>
      <img src="${role('EFDV')}" style="position:absolute;width:385px;right:310px;top:317px;transform:rotate(-8deg)"><img src="${role('CSDV')}" style="position:absolute;width:347px;right:10px;top:314px;transform:rotate(9deg)"><img src="${role('CSNL')}" style="position:absolute;width:500px;right:59px;top:133px">
      <div class="stamp" style="position:absolute;width:113px;height:113px;left:566px;top:280px;background:#fff0cbe8"><span class="tiny">FIND YOUR</span><b style="font-size:23px;white-space:nowrap">M-TYPE</b><span class="tiny">快乐存档</span></div>
      <div class="ribbon" style="position:absolute;left:0;bottom:0;width:100%;height:70px"><span>★ EVERY BITE TELLS A LITTLE STORY</span><span>麦门人格 × 时光档案 × 复古长图</span><span>独立创意作品 · 趣味画像</span></div></div>`);
    const atlasCards = manifest.characters.map((c, i) => `<div style="position:relative;height:330px;border:1px solid #bc8d504a;border-radius:5px;background:${i%3===0?'#ffe2a780':'#fff8e580'};padding:16px 20px;overflow:hidden"><div class="red" style="font-size:42px;font-weight:900;position:relative;z-index:1">${c.code}</div><span class="tiny" style="position:absolute;top:25px;right:20px;color:#997043">${String(i+1).padStart(2,'0')}</span><img src="${role(c.code)}" style="position:absolute;width:212px;height:212px;object-fit:contain;top:48px;right:8px"><div style="position:absolute;bottom:18px;left:20px;right:12px"><b style="font-size:22px">${esc(c.name)}</b><div style="font-size:12px;margin-top:7px;color:#825132">${esc(c.tagline)}</div></div></div>`).join('');
    await renderBoard(page, 'personality-atlas.png', 1440, 1630, `<div class="board" style="width:1440px;height:1630px;padding:44px 52px"><div class="mast"><div><div class="kicker red">THE M-TYPE COLLECTION / ALL SIXTEEN</div><div class="title" style="font-size:47px;margin-top:14px">十六种快乐，各有自己的形状。</div></div><div class="stamp" style="width:106px;height:106px"><b style="font-size:40px">16</b><span class="tiny">RETRO TYPES</span></div></div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px">${atlasCards}</div><div class="tiny" style="position:absolute;bottom:30px;left:53px;right:53px;display:flex;justify-content:space-between"><span>C / E 口味 &nbsp;·&nbsp; S / F 选择 &nbsp;·&nbsp; D / N 时段 &nbsp;·&nbsp; L / V 菜单</span><span>透明背景素材随 Skill 提供 · 趣味消费画像</span></div></div>`);
    const caseCards = cases.map((c, i) => `<div style="height:400px;border:1px solid #ad794146;background:#fff7e8b8;border-radius:6px;overflow:hidden"><div style="height:258px;overflow:hidden"><img src="${uri('docs/images/' + c.slug + '-hero.png')}" style="width:100%"></div><div style="padding:20px 24px"><span class="tiny red">CASE 0${i+1} &nbsp; / &nbsp; ${c.code}</span><div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:9px"><b style="font-size:25px">${esc(c.title)}</b><span style="font-size:13px">${c.report.count?`${c.report.count} 笔 · ${c.report.uniqueFoods} 种餐品`:'0 笔 · 问答人格'}</span></div><div style="font-size:14px;margin-top:11px;color:#8c5e3e">${esc(c.caption)}</div></div></div>`).join('');
    await renderBoard(page, 'case-wall.png', 1440, 1080, `<div class="board" style="width:1440px;height:1080px;padding:42px 52px"><div class="mast"><div><div class="kicker red">FOUR LITTLE STORIES / SAME FIXED TEMPLATE</div><div class="title" style="font-size:46px;margin-top:13px">同一份档案，四种快乐的样子。</div></div><div class="tag">全部为模拟案例<br><span style="display:block;margin-top:10px">SYNTHETIC DEMO DATA</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:26px">${caseCards}</div><div class="tiny" style="position:absolute;bottom:28px;left:52px;color:#956c49">人格、角色、统计与文案随数据切换；复古视觉和报告结构保持一致。</div></div>`);
    await renderBoard(page, 'reading-modes.png', 1440, 980, `<div class="board" style="width:1440px;height:980px;padding:44px 56px"><div class="mast"><div><div class="kicker red">READ ANYWHERE / KEEP A LITTLE HAPPINESS</div><div class="title" style="font-size:45px;margin-top:16px">电脑慢慢看，手机随手存。</div></div><div class="tag">OFFLINE HTML + LONG PNG<br><span style="display:block;margin-top:10px">示例：CSNL · 模拟数据</span></div></div><div style="position:absolute;left:58px;top:228px;width:940px;background:#4b2116;border-radius:14px;padding:12px;box-shadow:0 22px 40px #643d242e"><div style="height:29px;background:#4b2116;color:#efdfc5;font:12px Arial;padding-left:12px">● ● ● &nbsp; M-TYPE · PERSONAL ARCHIVE</div><div style="height:598px;background:#fff6df;overflow:hidden"><img src="${uri('output/release-cases/night-guardian/M-TYPE-CSNL-desktop.png')}" style="width:100%;display:block"></div></div><div style="position:absolute;right:60px;top:208px;width:308px;height:687px;background:#291812;border-radius:43px;border:5px solid #6b4430;box-shadow:0 25px 38px #643d2440;padding:9px"><div style="height:659px;overflow:hidden;border-radius:29px;position:relative;background:#fff6df"><div style="position:absolute;width:94px;height:18px;border-radius:12px;top:9px;left:50%;transform:translateX(-50%);background:#291812"></div><img src="${uri('docs/images/night-guardian-mobile.png')}" style="width:100%;display:block"></div></div><div style="position:absolute;left:66px;bottom:52px;font-size:18px">自包含 HTML · 响应式布局 · 清晰长图导出</div></div>`);
    if (errors.length || requests.length) throw new Error('展示渲染存在脚本错误或外部请求');
    fs.writeFileSync(path.join(root, 'docs/cases.json'), JSON.stringify({ dataSource: 'synthetic_only', cases: evidence }, null, 2) + '\n');
    const result = { cases: evidence, offline: true, widths: [320, 390, 1280], pngLayouts: ['desktop', 'mobile'], images: ['cover.png', 'personality-atlas.png', 'case-wall.png', 'reading-modes.png'] };
    fs.mkdirSync(path.join(root, 'output/publish'), { recursive: true });
    fs.writeFileSync(path.join(root, 'output/publish/showcase-verification.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { renderPersonal } = require('./lib/package-report.cjs');
const { options, readInput, fail } = require('./lib/cli.cjs');
async function main() {
  const args = options(process.argv.slice(2), ['--input', '--out', '--png']);
  if (args.help) { console.log('node scripts/render.cjs --input input.json --out output/dossier [--png desktop|mobile|both]'); return; }
  if (!args['--out']) throw new Error('请使用 --out 指定成品目录。');
  if (args['--png'] && !['desktop', 'mobile', 'both'].includes(args['--png'])) throw new Error('--png 仅支持 desktop、mobile 或 both。');
  const { documentData, html } = renderPersonal(readInput(args['--input']));
  const dir = path.resolve(args['--out']);
  const filename = path.join(dir, `M-TYPE-${documentData.report.code}.html`);
  const datafile = path.join(dir, `M-TYPE-${documentData.report.code}.json`);
  if ([filename, datafile].includes(path.resolve(args['--input']))) throw new Error('成品路径不能覆盖输入文件。');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filename, html);
  fs.writeFileSync(datafile, JSON.stringify(documentData, null, 2) + '\n');
  const result = { status: 'ready', code: documentData.report.code, html: filename, data: datafile, png: [] };
  if (args['--png']) {
    try { result.png = await require('./lib/export-report.cjs').exportHTML(filename, dir, args['--png']); }
    catch (error) {
      result.status = 'html_ready_png_failed';
      result.message = error.message;
      result.next = 'HTML 已生成，可在浏览器中打开并点击“保存长图”；自动导出准备好浏览器后可单独重试。';
      process.exitCode = 2;
    }
  }
  console.log(JSON.stringify(result, null, 2));
}
main().catch(fail);

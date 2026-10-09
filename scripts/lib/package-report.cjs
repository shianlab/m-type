'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { prepare, foodAsset } = require('../../template/report-model.js');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const imageURI = name => 'data:image/png;base64,' + fs.readFileSync(path.join(root, name)).toString('base64');
const imageLibrary = fs.existsSync(path.join(root, 'vendor/html-to-image.js')) ? 'vendor/html-to-image.js' : 'node_modules/html-to-image/dist/html-to-image.js';
const inlineJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function packageHTML(documentData = null) {
  const manifest = JSON.parse(read('assets/personalities-retro-v1/manifest.json'));
  const selected = documentData ? manifest.characters.filter(p => p.code === documentData.report.code) : manifest.characters;
  if (documentData && (documentData.status !== 'ready' || selected.length !== 1)) throw new Error('人格尚未确定，请先补充缺失回答。');
  const personalities = selected.map(({ code, name, tagline }) => ({ code, name, tagline, image: imageURI(`assets/personalities-retro-v1/${code}.png`) }));
  const decorManifest = JSON.parse(read('assets/report-decor-v1/manifest.json'));
  const needed = new Set(['paper', 'heroScene', 'footerScene', 'fries', 'bag']);
  if (documentData?.report.ranked[0]) needed.add(foodAsset(documentData.report.ranked[0].name));
  const decor = Object.fromEntries(decorManifest.assets.filter(({ key }) => !documentData || needed.has(key)).map(({ key, file }) => [key, imageURI('assets/report-decor-v1/' + file)]));
  let html = read('template/index.html');
  for (const name of ['styles.css', 'decor.css', 'balance.css']) {
    html = html.replace(`<link rel="stylesheet" href="${name}">`, () => '<style>' + read('template/' + name) + '</style>');
  }
  const scripts = {
    '../node_modules/html-to-image/dist/html-to-image.js': read(imageLibrary).replace(/\/\/# sourceMappingURL=.*$/gm, ''),
    'personalities.js': 'window.MTYPE_PERSONALITIES = ' + inlineJSON(personalities) + ';',
    'assets.js': 'window.MTYPE_ASSETS = ' + inlineJSON(decor) + ';',
    'core.js': read('template/core.js'),
    'report-model.js': read('template/report-model.js'),
    'demo.js': documentData ? 'window.MTYPE_DOCUMENT = ' + inlineJSON(documentData) + ';' : read('template/demo.js'),
    'app.js': read('template/app.js')
  };
  for (const [src, body] of Object.entries(scripts)) {
    html = html.replace(`<script src="${src}"></script>`, () => '<script>' + body.replace(/<\/script/gi, '<\\/script') + '</script>');
  }
  return html;
}
function renderPersonal(input) {
  const documentData = prepare(input);
  if (documentData.status !== 'ready') {
    const error = new Error('还需要补充偏好回答，未生成个人档案。');
    error.questions = documentData.questions;
    throw error;
  }
  return { documentData, html: packageHTML(documentData) };
}
module.exports = { packageHTML, renderPersonal, inlineJSON };

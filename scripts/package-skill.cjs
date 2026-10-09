'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { digest, filesAt, verify } = require('./lib/skill-integrity.cjs');
const root = path.resolve(__dirname, '..');
function build(destination) {
  if (fs.existsSync(destination)) throw new Error('构建目录已存在，请使用空目录。');
  fs.mkdirSync(destination, { recursive: true });
  const copy = (from, to = from) => {
    const src = path.join(root, from), dest = path.join(destination, to);
    if (!fs.lstatSync(src).isFile()) throw new Error('只允许打包普通文件：' + from);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  };
  for (const file of filesAt(path.join(root, 'skill/m-type'))) copy('skill/m-type/' + file, file);
  for (const file of ['index.html', 'app.js', 'core.js', 'report-model.js', 'styles.css', 'decor.css', 'balance.css', 'demo.js', 'assets.js', 'personalities.js']) copy('template/' + file);
  for (const file of ['doctor.cjs', 'analyze.cjs', 'answer.cjs', 'render.cjs', 'export.cjs', 'mcp-normalize.cjs', 'install-skill.cjs', 'lib/cli.cjs', 'lib/package-report.cjs', 'lib/export-report.cjs', 'lib/mcd-adapter.cjs', 'lib/skill-integrity.cjs']) copy('scripts/' + file);
  for (const dir of ['personalities-retro-v1', 'report-decor-v1']) {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', dir, 'manifest.json')));
    copy(`assets/${dir}/manifest.json`);
    for (const item of manifest.characters || manifest.assets) copy(`assets/${dir}/${item.file || item.code + '.png'}`);
  }
  for (const file of ['order-list.schema.json', 'query-order.schema.json', 'verification.json']) copy('references/mcp/' + file);
  for (const file of ['day-researcher.json', 'empty-with-answers.json', 'needs-answers.json']) copy('examples/' + file);
  copy('node_modules/html-to-image/dist/html-to-image.js', 'vendor/html-to-image.js');
  copy('node_modules/html-to-image/LICENSE', 'vendor/html-to-image.LICENSE');
  const version = JSON.parse(fs.readFileSync(path.join(destination, 'package.json'))).version;
  const manifest = { schemaVersion: 1, name: 'm-type', version, files: Object.fromEntries(filesAt(destination).map(file => [file, digest(path.join(destination, file))])) };
  fs.writeFileSync(path.join(destination, 'package-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  verify(destination);
  return manifest;
}
if (require.main === module) {
  try {
    const dist = path.join(root, 'dist');
    fs.mkdirSync(dist, { recursive: true });
    const stage = fs.mkdtempSync(path.join(dist, '.build-'));
    try {
      const pkg = path.join(stage, 'm-type'), manifest = build(pkg);
      const archive = path.join(stage, `m-type-${manifest.version}.zip`);
      const zip = spawnSync('python3', [path.join(root, 'scripts/zip-skill.py'), pkg, archive], { encoding: 'utf8' });
      if (zip.error || zip.status !== 0) throw new Error('ZIP 构建失败，需要 Python 3：' + (zip.error?.message || zip.stderr));
      // Only these generated release paths are replaced; source, private data and installed skills are untouched.
      fs.rmSync(path.join(dist, 'm-type'), { recursive: true, force: true });
      fs.renameSync(pkg, path.join(dist, 'm-type'));
      fs.renameSync(archive, path.join(dist, path.basename(archive)));
      const finalZip = path.join(dist, path.basename(archive));
      fs.writeFileSync(path.join(dist, 'SHA256SUMS'), digest(finalZip) + '  ' + path.basename(finalZip) + '\n');
      console.log(JSON.stringify({ status: 'packaged', version: manifest.version, files: Object.keys(manifest.files).length, zip: finalZip, bytes: fs.statSync(finalZip).size, sha256: digest(finalZip) }, null, 2));
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { build };

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function filesAt(root, allowDependencies = false, prefix = '') {
  const files = [];
  for (const name of fs.readdirSync(path.join(root, prefix)).sort()) {
    if (name.startsWith('._') || name === '.DS_Store') continue;
    if (allowDependencies && !prefix && name === 'node_modules') continue;
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = fs.lstatSync(path.join(root, rel));
    if (stat.isSymbolicLink()) throw new Error('安装包不接受符号链接：' + rel);
    if (stat.isDirectory()) files.push(...filesAt(root, allowDependencies, rel));
    else if (stat.isFile()) files.push(rel);
    else throw new Error('安装包含不支持的文件：' + rel);
  }
  return files;
}
function verify(root, allowDependencies = false) {
  const entries = filesAt(root, allowDependencies);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package-manifest.json'), 'utf8'));
  if (manifest.name !== 'm-type' || manifest.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(manifest.version) || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) throw new Error('安装包清单无效。');
  const actual = entries.filter(file => file !== 'package-manifest.json').sort();
  const expected = Object.keys(manifest.files).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('安装包文件缺失或包含清单外文件。');
  for (const rel of expected) {
    if (!/^[a-f0-9]{64}$/.test(manifest.files[rel]) || digest(path.join(root, rel)) !== manifest.files[rel]) throw new Error('安装包校验失败：' + rel);
  }
  for (const file of ['SKILL.md', 'scripts/doctor.cjs', 'scripts/render.cjs', 'assets/personalities-retro-v1/manifest.json', 'vendor/html-to-image.js']) if (!Object.hasOwn(manifest.files, file)) throw new Error('缺少 Skill 必要文件。');
  return manifest;
}
module.exports = { digest, filesAt, verify };

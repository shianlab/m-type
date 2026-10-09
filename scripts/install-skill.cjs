'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { options, fail } = require('./lib/cli.cjs');
const { verify } = require('./lib/skill-integrity.cjs');
function install(source, targetParent) {
  const input = path.resolve(source), parent = path.resolve(targetParent), dest = path.join(parent, 'm-type');
  const manifest = verify(input);
  if (dest === input || dest.startsWith(input + path.sep)) throw new Error('安装目标不能位于源包内。');
  let existingStat;
  try { existingStat = fs.lstatSync(dest); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existingStat) {
    if (fs.lstatSync(dest).isSymbolicLink()) throw new Error('已有同名目标是符号链接，未修改。');
    let existing;
    try { existing = verify(dest, true); } catch { throw new Error('已有同名 Skill 有修改或不完整，未覆盖。请先检查并备份。'); }
    if (JSON.stringify(existing) === JSON.stringify(manifest)) return { status: 'already_installed', path: dest, version: manifest.version };
    throw new Error('已有不同版本的 m-type，未覆盖。请先备份并确认更新范围。');
  }
  fs.mkdirSync(parent, { recursive: true });
  const stage = fs.mkdtempSync(path.join(parent, '.m-type-install-'));
  try {
    for (const rel of [...Object.keys(manifest.files), 'package-manifest.json']) {
      const file = path.join(stage, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.copyFileSync(path.join(input, rel), file, fs.constants.COPYFILE_EXCL);
    }
    verify(stage);
    if (fs.existsSync(dest)) throw new Error('目标在安装期间出现，未覆盖。');
    fs.renameSync(stage, dest);
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  return { status: 'installed_files', path: dest, version: manifest.version, next: '运行 doctor，并在宿主重载技能后验证发现；文件安装不等于 MCP 连接。' };
}
if (require.main === module) {
  try {
    const args = options(process.argv.slice(2), ['--source', '--target']);
    if (args.help) console.log('node scripts/install-skill.cjs --source /path/to/m-type --target /path/to/host/skills');
    else {
      if (!args['--source'] || !args['--target']) throw new Error('必须显式提供 --source 包目录和 --target 宿主技能父目录。');
      console.log(JSON.stringify(install(args['--source'], args['--target']), null, 2));
    }
  } catch (error) { fail(error); }
}
module.exports = { install };

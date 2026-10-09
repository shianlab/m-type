'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { packageHTML } = require('./lib/package-report.cjs');
const out = path.resolve(__dirname, '../output');
fs.mkdirSync(out, { recursive: true });
const filename = path.join(out, 'M-TYPE-麦门人格档案.html');
fs.writeFileSync(filename, packageHTML());
console.log('Built offline demo with 16 embedded characters: ' + filename);

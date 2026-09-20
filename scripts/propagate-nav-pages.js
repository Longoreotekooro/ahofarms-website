// Every page the propagate scripts stamp: the root *.html files plus the
// generated portal pages, as root-relative keys ('about.html',
// 'portal/index.html', 'portal/prescriber/login.html').
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function listPages() {
  const out = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  const portalDir = path.join(ROOT, 'portal');
  if (fs.existsSync(portalDir)) {
    for (const entry of fs.readdirSync(portalDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) out.push(`portal/${entry.name}`);
      if (entry.isDirectory()) fs.readdirSync(path.join(portalDir, entry.name)).filter(f => f.endsWith('.html')).forEach(f => out.push(`portal/${entry.name}/${f}`));
    }
  }
  return out;
}
module.exports = { listPages };

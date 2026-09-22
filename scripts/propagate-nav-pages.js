// Every page the propagate scripts stamp: the root *.html files plus the
// generated portal and news pages, as root-relative keys ('about.html',
// 'portal/index.html', 'news/example.html').
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function listPages() {
  const out = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  for (const dirname of ['portal', 'news']) {
    const dir = path.join(ROOT, dirname);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.html')) out.push(`${dirname}/${entry.name}`);
      if (entry.isDirectory()) fs.readdirSync(path.join(dir, entry.name)).filter(f => f.endsWith('.html')).forEach(f => out.push(`${dirname}/${entry.name}/${f}`));
    }
  }
  return out.sort();
}
module.exports = { listPages };

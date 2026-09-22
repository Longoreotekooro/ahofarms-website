// Converts links to repository HTML files into their public clean URL form.
// Run after the page generators so generated navigation and body links never
// send visitors through Vercel's automatic .html redirect.
const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const { cleanPathForFile } = require('./url-utils');

const ROOT = path.join(__dirname, '..');

function cleanHref(file, href) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) return href;
  const match = /^([^?#]*)([?#].*)?$/.exec(href);
  const pathname = match[1];
  const suffix = match[2] || '';
  if (!pathname.endsWith('.html')) return href;

  const resolved = pathname.startsWith('/')
    ? pathname.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname));
  return cleanPathForFile(resolved) + suffix;
}

let changed = 0;
for (const file of listPages()) {
  const full = path.join(ROOT, file);
  const before = fs.readFileSync(full, 'utf8');
  const after = before.replace(/href="([^"]+)"/gi, (all, href) => `href="${cleanHref(file, href)}"`);
  if (after !== before) {
    fs.writeFileSync(full, after);
    changed++;
  }
}

console.log(`clean internal links: ${changed} pages updated`);

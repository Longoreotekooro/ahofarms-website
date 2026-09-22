const fs = require('fs');
const path = require('path');
const { NAV, CTA, SENTINEL_START, SENTINEL_END } = require('./nav-config');
const { listPages } = require('./propagate-nav-pages');

const ROOT = path.join(__dirname, '..');
const failures = [];

function fail(msg) { failures.push(msg); }

// Collect every href the nav references.
const allLinks = [];
NAV.forEach(p => { allLinks.push(p.href); p.children.forEach(c => allLinks.push(c.href)); });
allLinks.push(CTA.href);

// 1. Every href resolves: file exists, and if it has a #anchor, that id exists in the file.
[...new Set(allLinks)].forEach(href => {
  const [file, anchor] = href.split('#');
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) { fail(`MISSING FILE: ${href} -> ${file}`); return; }
  if (anchor) {
    const html = fs.readFileSync(full, 'utf8');
    if (!html.includes(`id="${anchor}"`)) fail(`MISSING ANCHOR: ${href} (no id="${anchor}" in ${file})`);
  }
});

// 2. Every page carries exactly one sentinel-delimited nav block.
const pages = listPages();
pages.forEach(p => {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const starts = html.split(SENTINEL_START).length - 1;
  const ends = html.split(SENTINEL_END).length - 1;
  if (starts !== 1 || ends !== 1) fail(`BAD SENTINELS: ${p} (start=${starts} end=${ends}, expected 1/1)`);
});

// 3. No page links to a file that does not exist. Root-absolute links
//    (/portal/...) resolve from the site root, relative ones from the page.
pages.forEach(p => {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const hrefs = [...html.matchAll(/href="([^"#:?]+\.html)(?:[?#][^"]*)?"/g)].map(m => m[1]);
  [...new Set(hrefs)].forEach(h => {
    const full = h.startsWith('/') ? path.join(ROOT, h) : path.resolve(path.join(ROOT, path.dirname(p)), h);
    if (!full.startsWith(ROOT) || !fs.existsSync(full)) fail(`DEAD LINK: ${p} -> ${h}`);
  });
});

// 3b. The Portals nav item agrees with the registry in lib/portals.js.
const portalsNav = NAV.find(p => p.key === 'portals');
const { isPublic } = require('./nav-config');
import('../lib/portals.js').then(({ PORTALS, CONSUMER }) => {
  const want = [...(isPublic(CONSUMER.id) ? [`portal/${CONSUMER.id}/index.html`] : []), ...PORTALS.filter(p => isPublic(p.id)).map(p => `portal/${p.id}/login.html`)];
  if (!fs.existsSync(path.join(ROOT, 'portal', CONSUMER.id, 'index.html'))) fail(`MISSING PORTAL PAGE: portal/${CONSUMER.id}/index.html (run scripts/build-portals.js)`);
  const have = portalsNav ? portalsNav.children.map(c => c.href) : [];
  if (JSON.stringify(want) !== JSON.stringify(have)) fail(`PORTALS NAV: nav-config children ${JSON.stringify(have)} != registry ${JSON.stringify(want)}`);
  PORTALS.forEach(p => ['login', 'request-access', 'forgot', 'reset', 'home', 'account'].forEach(pg => {
    if (!fs.existsSync(path.join(ROOT, 'portal', p.id, pg + '.html'))) fail(`MISSING PORTAL PAGE: portal/${p.id}/${pg}.html (run scripts/build-portals.js)`);
  }));
  finish();
});

// 4. Active-parent selection: first matching parent must win (regression
// guard for the last-match-wins bug that put Buy active on the homepage).
const { renderNav } = require('./render-nav');
const ACTIVE_PARENT_CASES = [
  ['index.html', 'Learn'],
  ['about.html', 'Learn'],
  ['products.html', 'Buy'],
  ['news.html', 'Learn'],
];
ACTIVE_PARENT_CASES.push(['portal/prescriber/login.html', 'Portals'], ['portal/pharmacy/home.html', 'Portals'], ['portal/index.html', 'Portals']);
ACTIVE_PARENT_CASES.forEach(([page, expected]) => {
  const html = renderNav(page);
  const activeMatch = html.match(/<li class="nav-parent is-active"[^>]*data-idx="(\d+)"/);
  const activeIdx = activeMatch ? Number(activeMatch[1]) : -1;
  const actual = activeIdx === -1 ? '(none)' : NAV[activeIdx].en;
  if (actual !== expected) {
    fail(`ACTIVE PARENT: renderNav('${page}') -> ${actual}, expected ${expected}`);
  }
});

function finish() {
  if (failures.length) {
    console.error(`FAIL (${failures.length}):`);
    failures.forEach(f => console.error('  ' + f));
    process.exit(1);
  }
  console.log(`PASS - ${pages.length} pages, ${new Set(allLinks).size} nav targets, all resolve.`);
}

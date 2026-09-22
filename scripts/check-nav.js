const fs = require('fs');
const path = require('path');
const { NAV, CTA, SENTINEL_START, SENTINEL_END } = require('./nav-config');
const { listPages } = require('./propagate-nav-pages');
const { fileForCleanPath } = require('./url-utils');

const ROOT = path.join(__dirname, '..');
const failures = [];

function fail(msg) { failures.push(msg); }

// Collect every href the nav references.
const allLinks = [];
NAV.forEach(p => { allLinks.push(p.href); p.children.forEach(c => allLinks.push(c.href)); });
allLinks.push(CTA.href);

// 1. Every href resolves: file exists, and if it has a #anchor, that id exists in the file.
[...new Set(allLinks)].forEach(href => {
  const [route, anchor] = href.split('#');
  let file = fileForCleanPath(route);
  const directoryIndex = path.join(ROOT, route.replace(/^\//, ''), 'index.html');
  if (fs.existsSync(directoryIndex)) file = path.relative(ROOT, directoryIndex);
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

// 3. No internal anchor links point to a route without a backing HTML file,
//    and no generated page sends visitors through an avoidable .html redirect.
pages.forEach(p => {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  const htmlLinks = [...markup.matchAll(/<a\b[^>]*\bhref="([^"]*\.html(?:[?#][^"]*)?)"/gi)].map(m => m[1]);
  htmlLinks.forEach(h => fail(`NON-CLEAN LINK: ${p} -> ${h}`));
  const hrefs = [...markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map(m => m[1])
    .filter(h => !/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(h));
  [...new Set(hrefs)].forEach(h => {
    const pathOnly = h.split(/[?#]/)[0];
    if (!pathOnly) return;
    const absolute = h.startsWith('/') ? pathOnly : path.posix.normalize('/' + path.posix.join(path.posix.dirname('/' + p), pathOnly));
    let candidate = path.join(ROOT, fileForCleanPath(absolute));
    const directoryIndex = path.join(ROOT, absolute.replace(/^\//, ''), 'index.html');
    if (fs.existsSync(directoryIndex)) candidate = directoryIndex;
    if (!candidate.startsWith(ROOT) || !fs.existsSync(candidate)) fail(`DEAD LINK: ${p} -> ${h}`);
  });
});

// 3b. The Portals nav item agrees with the registry in lib/portals.js.
const portalsNav = NAV.find(p => p.key === 'portals');
const { isPublic } = require('./nav-config');
import('../lib/portals.js').then(({ PORTALS, CONSUMER }) => {
  const want = [...(isPublic(CONSUMER.id) ? [`/portal/${CONSUMER.id}`] : []), ...PORTALS.filter(p => isPublic(p.id)).map(p => `/portal/${p.id}/login`)];
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
  ['products.html', 'Products'],
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

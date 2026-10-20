// Static policy/sitemap checks. No external requests or form submissions.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { TEMPORARY_NOINDEX_PAGES, stampTemporaryNoindex } = require('./indexing');
const { cleanPathForFile } = require('./url-utils');
const root = path.join(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const robots = fs.readFileSync(path.join(root, 'robots.txt'), 'utf8');
assert.equal(TEMPORARY_NOINDEX_PAGES.size, 4);
for (const file of TEMPORARY_NOINDEX_PAGES) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const head = html.split(/<\/head>/i)[0];
  assert.equal((head.match(/<meta name="robots" content="noindex, follow">/g) || []).length, 1, file);
  assert.equal(stampTemporaryNoindex(html, file), html, file + ' idempotence');
  assert(!sitemap.includes('https://ahofarms.com' + cleanPathForFile(file) + '</loc>'), file + ' sitemap exclusion');
}
for (const file of ['contact.html', 'export-partners.html', 'social-impact.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert(!/<meta name="robots" content="noindex/i.test(html), file + ' stays indexable');
  assert.equal(stampTemporaryNoindex(html, file), html, file + ' unchanged policy');
  assert(sitemap.includes('https://ahofarms.com' + cleanPathForFile(file) + '</loc>'), file + ' remains in sitemap');
}
assert.equal(robots, "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://ahofarms.com/sitemap.xml\n", 'Keep crawl access unchanged');
const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const news = fs.readFileSync(path.join(root, 'news.html'), 'utf8');
assert(home.includes('href="/products"') && home.includes('href="/portal/consumers"'), 'Useful public links stay');
for (const slug of ['sustainable-sun-grown', 'kaitiakitanga-land-wellness']) assert(news.includes(`href="/news/${slug}"`), slug + ' news link stays');
console.log('INDEXING CHECK PASS: exactly four temporary noindex/follow pages; sitemap exclusion, crawl access, links and unaffected Contact/Export/Social scope verified.');

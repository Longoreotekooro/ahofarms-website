// Static installation and bootstrap checks; no network calls or form submits.
//   node scripts/check-gtm.js
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { listPages } = require('./propagate-nav-pages');
const { PUBLIC_GTM_PAGES, stampGtm } = require('./gtm');
const ROOT = path.join(__dirname, '..');
const pages = listPages();
const count = (html, re) => [...html.matchAll(re)].length;

for (const file of PUBLIC_GTM_PAGES) assert(pages.includes(file), `Missing GTM page: ${file}`);
for (const file of pages) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const html = raw.replace(/\r\n/g, '\n');
  const included = PUBLIC_GTM_PAGES.has(file);
  assert.equal(count(html, /googletagmanager\.com\/gtm\.js\?id=/g), included ? 1 : 0, `${file}: loader count`);
  assert.equal(count(html, /googletagmanager\.com\/ns\.html\?id=/g), included ? 1 : 0, `${file}: noscript count`);
  assert.equal(count(html, /GTM-[A-Z0-9]+/g), included ? 2 : 0, `${file}: container count`);
  assert(!/<script\b[^>]*src=["'][^"']*(?:google-analytics|gtag\/js|hubspot|hs-scripts)/i.test(html), `${file}: direct analytics loader`);
  assert.equal(stampGtm(raw, file), raw, `${file}: installation must be idempotent`);
  if (!included) continue;
  assert(/<head\b[^>]*>\s*<!-- Google Tag Manager -->\s*<script>/i.test(html), `${file}: loader must lead head`);
  assert(/<body\b[^>]*>\s*<!-- Google Tag Manager \(noscript\) -->\s*<noscript><iframe src="https:\/\/www\.googletagmanager\.com\/ns\.html\?id=GTM-WJN7H2PZ"\s+height="0" width="0" style="display:none;visibility:hidden"><\/iframe><\/noscript>/i.test(html), `${file}: noscript must lead body`);
  assert(html.indexOf('<meta charset=') < 1024, `${file}: preserve early charset declaration`);

  // Execute the actual page bootstrap with a stub document. Verify it keeps
  // an existing dataLayer and inserts one async script with the exact URL.
  const existing = { event: 'existing' };
  const window = { dataLayer: [existing] };
  const inserted = [];
  const first = { parentNode: { insertBefore: (node, anchor) => { assert.equal(anchor, first); inserted.push(node); } } };
  const document = {
    getElementsByTagName: tag => { assert.equal(tag, 'script'); return [first]; },
    createElement: tag => { assert.equal(tag, 'script'); return {}; },
  };
  const script = html.match(/<!-- Google Tag Manager -->\s*<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { window, document });
  assert.equal(inserted.length, 1, `${file}: runtime loader count`);
  assert.equal(inserted[0].async, true);
  assert.equal(inserted[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-WJN7H2PZ');
  assert.equal(window.dataLayer[0], existing);
  assert.equal(window.dataLayer.length, 2);
  assert.equal(window.dataLayer[1].event, 'gtm.js');
  assert.equal(typeof window.dataLayer[1]['gtm.start'], 'number');
}

// The later Vercel header overrides CSP only on the approved public paths.
const config = require('../vercel.json');
const cspRules = config.headers.filter(rule => rule.headers.some(h => h.key === 'Content-Security-Policy'));
assert.equal(cspRules.length, 2);
const policy = rule => rule.headers.find(h => h.key === 'Content-Security-Policy').value;
const [baseline, marketing] = cspRules.map(policy);
assert(!baseline.includes('googletagmanager.com'), 'Global/portal CSP must retain its original scope');
assert(!marketing.includes("'unsafe-eval'"), 'Do not allow unsafe-eval');
const route = new RegExp(`^${cspRules[1].source}$`);
assert(route.test('/'), 'Homepage CSP');
for (const file of pages) {
  assert.equal(route.test('/' + file), PUBLIC_GTM_PAGES.has(file), `${file}: CSP scope`);
  assert.equal(route.test('/' + file.replace(/\.html$/, '')), PUBLIC_GTM_PAGES.has(file), `${file}: extensionless CSP scope`);
}
for (const url of ['/portal', '/portal/', '/patients', '/clinical', '/api/contact/send', '/unknown', '/about/extra']) {
  assert(!route.test(url), `${url}: CSP must remain excluded`);
}
const expected = baseline.replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com")
  .replace("connect-src 'self' https://feeds.behold.so;", "connect-src 'self' https://feeds.behold.so https://www.googletagmanager.com https://www.google.com; frame-src 'self' https://www.googletagmanager.com;");
assert.equal(marketing, expected, 'Only the documented GTM CSP additions are allowed');
console.log(`GTM CHECK PASS — ${PUBLIC_GTM_PAGES.size} installed, ${pages.length - PUBLIC_GTM_PAGES.size} excluded; placement, async bootstrap, duplicates and CSP scope verified.`);

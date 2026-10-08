// Install just the GTM blocks without regenerating unrelated shared chrome.
//   node scripts/propagate-gtm.js && node scripts/check-gtm.js
const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const { PUBLIC_GTM_PAGES, stampGtm } = require('./gtm');
const ROOT = path.join(__dirname, '..');

for (const file of listPages()) {
  const full = path.join(ROOT, file);
  const raw = fs.readFileSync(full, 'utf8');
  const out = stampGtm(raw, file);
  if (out !== raw) fs.writeFileSync(full, out);
}
console.log(`GTM installed on ${PUBLIC_GTM_PAGES.size} public pages; other pages excluded.`);

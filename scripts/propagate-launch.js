// Applies the staged-launch flags (portal-flags.json) to hand-authored
// snippets that mention a portal. Authors wrap such a snippet as
//   <!-- AHO:GATE:<id> -->…<!-- /AHO:GATE -->
// where <id> is a portal id, or `any-professional` (shown while any
// professional portal is public) or `consumers-only` (shown while none is).
// When the gate is closed the snippet is folded into a single HTML comment
//   <!-- AHO:GATE:<id>:OFF …snippet… /AHO:GATE -->
// so it leaves the public markup entirely and can be restored by flipping
// the flag and re-running this script. Idempotent; preserves line endings.
//
// Run after propagate-nav.js and propagate-chrome.js:
//   node scripts/propagate-launch.js && node scripts/check-launch.js
const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const FLAGS = require('../portal-flags.json');

const ROOT = path.join(__dirname, '..');
const isPublic = id => !!(FLAGS.portals[id] && FLAGS.portals[id].public);
const anyProfessional = ['prescriber', 'pharmacy', 'export-partner'].some(isPublic);
function open_(id) {
  if (id === 'any-professional') return anyProfessional;
  if (id === 'consumers-only') return !anyProfessional;
  if (!(id in FLAGS.portals)) throw new Error(`propagate-launch: unknown gate id "${id}"`);
  return isPublic(id);
}
const detectEOL = raw => ((raw.match(/\r\n/g) || []).length > (raw.match(/[^\r]\n/g) || []).length ? '\r\n' : '\n');

let gates = 0, closed = 0;
for (const file of listPages()) {
  const full = path.join(ROOT, file);
  const raw = fs.readFileSync(full, 'utf8');
  const eol = detectEOL(raw);
  let html = raw.replace(/\r\n/g, '\n');
  // open form
  html = html.replace(/<!-- AHO:GATE:([a-z-]+) -->([\s\S]*?)<!-- \/AHO:GATE -->/g, (m, id, inner) => {
    gates++;
    if (open_(id)) return m;
    if (inner.includes('--')) throw new Error(`propagate-launch: ${file}: gated snippet for ${id} contains "--"`);
    closed++;
    return `<!-- AHO:GATE:${id}:OFF ${inner} /AHO:GATE -->`;
  });
  // closed form
  html = html.replace(/<!-- AHO:GATE:([a-z-]+):OFF ([\s\S]*?) \/AHO:GATE -->/g, (m, id, inner) => {
    gates++;
    if (!open_(id)) { closed++; return m; }
    return `<!-- AHO:GATE:${id} -->${inner}<!-- /AHO:GATE -->`;
  });
  const out = html.replace(/\n/g, eol);
  if (out !== raw) fs.writeFileSync(full, out);
}
console.log(`launch gates: ${gates} found, ${closed} closed (public portals: ${Object.keys(FLAGS.portals).filter(isPublic).join(', ') || 'none'})`);

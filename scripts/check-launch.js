// Launch QA: nothing on the public site may reference a portal whose flag
// is off. Scans every publicly reachable page (root pages except gated
// information pages, the portal hub, the public portals' pages) for the
// hidden portals' names, paths, login links and information pages, and
// for any still-open gate. Exit 1 on the first problem list.
//   node scripts/check-launch.js
const fs = require('fs');
const path = require('path');
const FLAGS = require('../portal-flags.json');
const { listPages } = require('./propagate-nav-pages');

const ROOT = path.join(__dirname, '..');
const isPublic = id => !!(FLAGS.portals[id] && FLAGS.portals[id].public);
const hidden = Object.keys(FLAGS.portals).filter(id => !isPublic(id));
const infoPages = Object.entries(FLAGS.infoPages).filter(([k]) => k !== '_comment');
const hiddenInfo = infoPages.filter(([, id]) => !isPublic(id)).map(([k]) => k);
const NAMES = { prescriber: ['Prescriber Portal', 'Prescriber Login', 'prescriber portal'], pharmacy: ['Pharmacy Portal', 'Pharmacy Login', 'pharmacy portal'], 'export-partner': ['Export Partner Portal', 'Export Partner Login', 'export partner portal', 'Partner Portal'], consumers: ['Consumer Portal'] };

const patterns = [];
for (const id of hidden) {
  for (const n of NAMES[id] || []) patterns.push([id, new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')]);
  patterns.push([id, new RegExp(`portal/${id}/`, 'i')]);
}
for (const page of hiddenInfo) patterns.push([`info:${page}`, new RegExp(`href="(\\.\\./)*${page.replace('.', '\\.')}`)]);
if (hidden.length) patterns.push(['any-hidden', /Access Portal/]);

// publicly reachable pages
const publicPages = listPages().filter(f => {
  if (hiddenInfo.includes(f)) return false;
  const m = /^portal\/([^/]+)\//.exec(f);
  if (m) return isPublic(m[1]);
  return true;
});

const problems = [];
for (const file of publicPages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  // strip closed gates (they are comments and never render) before scanning
  const visible = html.replace(/<!-- AHO:GATE:[a-z-]+:OFF [\s\S]*? \/AHO:GATE -->/g, '');
  const lines = visible.split('\n');
  lines.forEach((line, i) => {
    for (const [id, re] of patterns) if (re.test(line)) problems.push(`${file}:${i + 1} mentions ${id}: ${line.trim().slice(0, 110)}`);
  });
  // an open gate for a hidden portal means propagate-launch.js has not run
  const openGates = [...html.matchAll(/<!-- AHO:GATE:([a-z-]+) -->/g)].map(m => m[1]).filter(id => hidden.includes(id));
  openGates.forEach(id => problems.push(`${file}: gate for hidden portal "${id}" is open (run scripts/propagate-launch.js)`));
}
if (problems.length) {
  console.error(`LAUNCH CHECK FAILED (${problems.length}):`);
  problems.slice(0, 60).forEach(p => console.error('  ' + p));
  process.exit(1);
}
console.log(`LAUNCH CHECK PASS — ${publicPages.length} public pages carry no reference to hidden portals (${hidden.join(', ') || 'none hidden'}).`);

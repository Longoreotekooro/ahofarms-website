// sitemap.xml + robots.txt for the public site: every page that is neither
// noindex nor part of a hidden portal. Hidden portals are simply absent
// (never disallowed by name). Run after propagate-chrome.js.
const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const SITE = require('../site.json');
const FLAGS = require('../portal-flags.json');
const ROOT = path.join(__dirname, '..');
const isPublic = id => !!(FLAGS.portals[id] && FLAGS.portals[id].public);
const gatedInfo = Object.entries(FLAGS.infoPages).filter(([k, v]) => k !== '_comment' && !isPublic(v)).map(([k]) => k);
const urls = [];
for (const f of listPages()) {
  if (gatedInfo.includes(f)) continue;
  const m = /^portal\/([^/]+)\//.exec(f);
  if (m && !isPublic(m[1])) continue;
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (/name="robots" content="noindex/.test(html)) continue;
  const mtime = fs.statSync(path.join(ROOT, f)).mtime.toISOString().slice(0, 10);
  urls.push({ loc: SITE.url + '/' + (f === 'index.html' ? '' : f), lastmod: mtime, priority: f === 'index.html' ? '1.0' : f.startsWith('portal/') ? '0.8' : '0.7' });
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE.url}/sitemap.xml\n`);
console.log(`sitemap: ${urls.length} URLs; robots.txt written`);

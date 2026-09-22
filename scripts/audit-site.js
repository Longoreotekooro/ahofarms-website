// Site audit: static checks over every publicly reachable page. Prints a
// report and exits 1 on broken links or missing images.
//   node scripts/audit-site.js            summary
//   node scripts/audit-site.js --verbose  every finding
const fs = require('fs');
const path = require('path');
const { listPages } = require('./propagate-nav-pages');
const FLAGS = require('../portal-flags.json');
const ROOT = path.join(__dirname, '..');
const verbose = process.argv.includes('--verbose');
const isPublic = id => !!(FLAGS.portals[id] && FLAGS.portals[id].public);
const hiddenInfo = Object.entries(FLAGS.infoPages).filter(([k, v]) => k !== '_comment' && !isPublic(v)).map(([k]) => k);
const pages = listPages().filter(f => { const m = /^portal\/([^/]+)\//.exec(f); if (m) return isPublic(m[1]); return !hiddenInfo.includes(f); });

const R = { broken: [], missingImg: [], noAlt: [], noDims: [], bigImg: [], eagerImg: [], video: [], meta: [], h1: [], fonts: new Set(), weights: new Set(), inlineStyles: 0, styleBytes: 0, overflowRisk: [] };
const attr = (tag, name) => { const m = new RegExp(`\\s${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag); return m ? (m[2] ?? m[3] ?? m[4]) : null; };
const resolve = (from, href) => { href = href.split(/[?#]/)[0]; return href.startsWith('/') ? path.join(ROOT, href) : path.resolve(path.join(ROOT, path.dirname(from)), href); };

for (const file of pages) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  // links
  for (const m of html.matchAll(/href="([^"#?:]+\.(html|pdf|css|js|svg|png|jpg|webp))(?:[?#][^"]*)?"/g)) {
    const t = resolve(file, m[1]); if (!fs.existsSync(t)) R.broken.push(`${file} -> ${m[1]}`);
  }
  // images
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src = attr(tag, 'src'); if (!src || /^(data:|https?:)/.test(src) || /['+]/.test(src)) continue;
    const t = resolve(file, src);
    if (!fs.existsSync(t)) { R.missingImg.push(`${file} -> ${src}`); continue; }
    if (attr(tag, 'alt') === null) R.noAlt.push(`${file}: ${src}`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) R.noDims.push(`${file}: ${src}`);
    if (!attr(tag, 'loading') && !/hero|poster/.test(src)) R.eagerImg.push(`${file}: ${src}`);
    const kb = Math.round(fs.statSync(t).size / 1024); if (kb > 600) R.bigImg.push(`${src} ${kb}KB`);
  }
  // video
  for (const tag of html.match(/<video\b[^>]*>/gi) || []) {
    const issues = [];
    if (!/\bmuted\b/i.test(tag) && /autoplay/i.test(tag)) issues.push('autoplay without muted');
    if (!/playsinline/i.test(tag)) issues.push('no playsinline');
    if (!attr(tag, 'poster')) issues.push('no poster');
    if (!attr(tag, 'preload')) issues.push('no preload attr');
    if (issues.length) R.video.push(`${file}: ${issues.join(', ')}`);
  }
  // meta
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1];
  const desc = /<meta name="description"/i.test(html);
  const og = /property="og:title"/i.test(html);
  const canon = /rel="canonical"/i.test(html);
  const viewport = /name="viewport"/i.test(html);
  const missing = [!title && 'title', !desc && 'description', !og && 'og', !canon && 'canonical', !viewport && 'viewport'].filter(Boolean);
  if (missing.length) R.meta.push(`${file}: missing ${missing.join(', ')}`);
  const h1s = (html.match(/<h1\b/gi) || []).length; if (h1s !== 1) R.h1.push(`${file}: ${h1s} h1`);
  // fonts + weights in page CSS
  for (const m of html.matchAll(/font-family:\s*([^;}]+)/gi)) { const f = m[1].trim(); if (!/var\(/.test(f)) R.fonts.add(f.split(',')[0].replace(/['"]/g, '').trim()); }
  for (const m of html.matchAll(/font-weight:\s*(\d{3})/gi)) R.weights.add(m[1]);
  R.inlineStyles += (html.match(/\sstyle="/g) || []).length;
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) R.styleBytes += m[1].length;
  if (/100vw/.test(html)) R.overflowRisk.push(file);
}
const out = [];
const sec = (t, arr, always) => { if (arr.length || always) { out.push(`\n## ${t} (${arr.length})`); (verbose ? arr : arr.slice(0, 12)).forEach(x => out.push('  ' + x)); if (!verbose && arr.length > 12) out.push(`  … ${arr.length - 12} more`); } };
out.push(`Audited ${pages.length} public pages.`);
sec('Broken links', R.broken, true); sec('Missing images', R.missingImg, true); sec('Images without alt', R.noAlt); sec('Images without width/height (layout shift risk)', R.noDims);
sec('Images over 600KB', [...new Set(R.bigImg)]); sec('Images without loading attribute', R.eagerImg); sec('Video attributes', R.video); sec('Page metadata', R.meta); sec('Heading structure', R.h1);
out.push(`\n## Typography\n  font families in page CSS: ${[...R.fonts].join(' | ')}\n  font weights used: ${[...R.weights].sort().join(', ')}`);
out.push(`\n## Code volume\n  inline style attributes: ${R.inlineStyles}\n  page-level <style> bytes: ${Math.round(R.styleBytes / 1024)}KB across ${pages.length} pages`);
sec('Pages using 100vw (overflow risk)', R.overflowRisk);
console.log(out.join('\n'));
if (R.broken.length || R.missingImg.length) process.exit(1);

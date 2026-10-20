// Temporary indexing-only treatment approved 19 October 2026.
// Keep these pages reachable and crawlable; do not hide their navigation.
const TEMPORARY_NOINDEX_PAGES = new Set([
  'products.html',
  'portal/consumers/index.html',
  'news/sustainable-sun-grown.html',
  'news/kaitiakitanga-land-wellness.html',
]);

function stampTemporaryNoindex(html, file) {
  if (!TEMPORARY_NOINDEX_PAGES.has(file)) return html;
  // These four pages have no other robots directives to retain. Normalise
  // repeated generation to one tag, without touching any other page's policy.
  html = html.replace(/\r?\n?[ \t]*<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/gi, '');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  return html.replace(/<meta charset="[^"]*"\s*\/?>/i,
    tag => `${tag}${eol}  <meta name="robots" content="noindex, follow">`);
}

module.exports = { TEMPORARY_NOINDEX_PAGES, stampTemporaryNoindex };

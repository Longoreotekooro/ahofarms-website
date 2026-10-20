const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PUBLIC_ANALYTICS_PAGES = new Set([
  'index.html', 'about.html', 'contact.html', 'cultivation.html',
  'disclaimer.html', 'export-partners.html', 'news.html', 'origins.html',
  'privacy.html', 'products.html', 'quality.html', 'social-impact.html',
  'team.html', 'terms.html', 'tohu.html', 'whats-new.html',
  'news/innovation-extraction.html', 'news/kaitiakitanga-land-wellness.html',
  'news/sustainable-sun-grown.html',
]);
function stampAnalytics(html, file) {
  html = html.replace(/\r?\n?<!-- AHO:ANALYTICS:START -->[\s\S]*?<!-- AHO:ANALYTICS:END -->/g, '');
  html = html.replace(/<!-- AHO:ANALYTICS:LINK -->[\s\S]*?<!-- AHO:ANALYTICS:LINK:END -->/g, '');
  if (!PUBLIC_ANALYTICS_PAGES.has(file)) return html;
  const version = crypto.createHash('sha1').update(fs.readFileSync(path.join(__dirname, '../assets/aho-analytics.js'))).digest('hex').slice(0, 8);
  const prefix = '../'.repeat(file.split('/').length - 1);
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const block = `<!-- AHO:ANALYTICS:START -->${eol}<script src="${prefix}assets/aho-analytics.js?v=${version}" defer></script>${eol}<!-- AHO:ANALYTICS:END -->`;
  html = html.replace(/(<a href="[^"]*privacy(?:\.html)?">Privacy<\/a>)/,
    `$1<!-- AHO:ANALYTICS:LINK --> · <a href="${prefix}privacy#analytics-settings">Analytics settings</a><!-- AHO:ANALYTICS:LINK:END -->`);
  // about.html uses HTML's implied head closure at <body>.
  const anchor = /<\/head>/i.test(html) ? /<\/head>/i : /<body\b[^>]*>/i;
  return html.replace(anchor, tag => `${block}${eol}${tag}`);
}
module.exports = { PUBLIC_ANALYTICS_PAGES, stampAnalytics };

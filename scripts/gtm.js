// Explicit public marketing scope. New pages need tracking/consent review
// before joining this list; never opt /portal/ or clinical pages in by default.
const PUBLIC_GTM_PAGES = new Set([
  'index.html', 'about.html', 'contact.html', 'cultivation.html',
  'disclaimer.html', 'export-partners.html', 'news.html', 'origins.html',
  'privacy.html', 'products.html', 'quality.html', 'social-impact.html',
  'team.html', 'terms.html', 'tohu.html', 'whats-new.html',
  'news/innovation-extraction.html', 'news/kaitiakitanga-land-wellness.html',
  'news/sustainable-sun-grown.html',
]);
// news/medicinal-cannabis-nz.html describes patient access, consultation
// and prescribing. It stays excluded until its tracking scope is reviewed.

// Google's ordinary asynchronous container snippet:
// https://support.google.com/tagmanager/answer/14847097
const HEAD_SNIPPET = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WJN7H2PZ');</script>
<!-- End Google Tag Manager -->`;

const BODY_SNIPPET = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WJN7H2PZ"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

function stampGtm(html, file) {
  // Remove our managed blocks first so reruns keep one copy and exclusions
  // remain excluded even if a page is copied from a marketing page.
  html = html.replace(/\r?\n?<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/g, '')
    .replace(/\r?\n?<!-- Google Tag Manager \(noscript\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript\) -->/g, '');
  if (!PUBLIC_GTM_PAGES.has(file)) return html;
  if (!/<head\b[^>]*>/i.test(html) || !/<body\b[^>]*>/i.test(html)) {
    throw new Error(`${file}: GTM needs explicit head and body opening tags`);
  }
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const block = snippet => snippet.replace(/\n/g, eol);
  return html.replace(/<head\b[^>]*>/i, tag => `${tag}${eol}${block(HEAD_SNIPPET)}`)
    .replace(/<body\b[^>]*>/i, tag => `${tag}${eol}${block(BODY_SNIPPET)}`);
}

module.exports = { PUBLIC_GTM_PAGES, HEAD_SNIPPET, BODY_SNIPPET, stampGtm };

const { NAV, CTA, SOCIAL } = require('./nav-config');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Bilingual label: both languages in one grid cell, sized to the wider.
// aria-label pins the accessible name to English so it never mutates.
function label(item) {
  return `<span class="bil"><span class="bil-en">${esc(item.en)}</span>` +
         `<span class="bil-mi" aria-hidden="true">${esc(item.mi)}</span></span>`;
}

function isActive(href, currentPage) {
  return href.split('#')[0] === currentPage;
}
// Internal hrefs are written relative to the site root; a page nested in a
// sub-directory (portal/<id>/*.html) gets them prefixed with ../ per level.
function relativize(html, prefix) {
  if (!prefix) return html;
  return html.replace(/(href|src)="(?![a-z][a-z0-9+.-]*:|\/|#|\.\.\/)/g, `$1="${prefix}`);
}
function prefixFor(currentPage) {
  const depth = currentPage.split('/').length - 1;
  return '../'.repeat(depth);
}

function renderNav(currentPage) {
  // Which parent owns the current page? Defaults to Learn (index 0).
  // First match wins (not last) - e.g. on the homepage, Learn's and Buy's
  // children both resolve to index.html, and Learn (index 0) must win.
  let activeIdx = 0;
  // Anchor children that point INTO the homepage (index.html#...) don't
  // claim the active state - the homepage belongs to Learn (index 0) by
  // default, not to whichever parent happens to hold a #section link.
  const foundIdx = NAV.findIndex((p) =>
    (p.match && p.match.test(currentPage)) ||
    p.children.some(c => isActive(c.href, currentPage) && !c.href.startsWith('index.html#')) ||
    isActive(p.href, currentPage)
  );
  if (foundIdx !== -1) activeIdx = foundIdx;

  // Each parent's children render as a <ul class="nav-sub"> INSIDE that
  // parent's own <li>, once. This is the single source for both the desktop
  // dropdown panel (closed by default; assets/aho-chrome.js toggles the
  // `hidden` attribute) and the mobile drawer, where the same list is laid
  // out flat with the parent as a group label (CEO, 2026-09-14: every page
  // visible, no accordion).
  const parents = NAV.map((p, i) => {
    const hasKids = p.children.length > 0;
    const caret = hasKids ? '<span class="nav-caret" aria-hidden="true"></span>' : '';
    const hasKidsAttr = hasKids ? ' data-haskids="1"' : '';
    const subId = `navSub${i}`;
    const aExtra = hasKids ? ` aria-expanded="false" aria-controls="${subId}"` : '';
    const sub = hasKids
      ? `\n          <ul class="nav-sub${p.children.some(c => c.desc) ? ' nav-sub--described' : ''}" id="${subId}" hidden>\n            ${p.children.map(c =>
          `<li><a href="${esc(c.href)}" aria-label="${esc(c.en)}">${label(c)}${c.desc ? `<small class="nav-sub-desc">${esc(c.desc)}</small>` : ''}</a></li>`
        ).join('\n            ')}\n          </ul>`
      : '';
    const keyAttr = p.key ? ` data-key="${esc(p.key)}"` : '';
    return `<li class="nav-parent${i === activeIdx ? ' is-active' : ''}"${hasKidsAttr}${keyAttr} data-idx="${i}">` +
           `<a href="${esc(p.href)}" aria-label="${esc(p.en)}"${aExtra}>${label(p)}${caret}</a>${sub}</li>`;
  }).join('\n        ');

  // The drawer's own footer (mobile only, hidden by CSS on desktop): the
  // social row, then the same wordmark the header uses.
  const drawerFoot =
    `<li class="nav-drawer-foot" aria-label="Aho Farms">` +
    `<a class="btn btn--primary nav-drawer-cta" href="${esc(CTA.href)}">${esc(CTA.en)} the team</a>` +
    `<ul class="nav-drawer-social" aria-label="Aho Farms on social media">` +
    SOCIAL.map(s => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${s.icon}</a></li>`).join('') +
    `</ul>` +
    `<a href="index.html" class="nav-drawer-mark" aria-label="Aho Farms home"><span class="aho-mark" aria-hidden="true"></span></a>` +
    `<p class="nav-drawer-line">Hawke&#39;s Bay · Aotearoa New Zealand</p>` +
    `</li>`;

  return relativize(`<nav class="nav" id="nav" aria-label="Main">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo" aria-label="Aho Farms home"><span class="aho-mark" aria-hidden="true"></span></a>
      <ul class="nav-links" id="navDrawer">
        ${parents}
        ${drawerFoot}
      </ul>
      <div class="nav-right">
        <ul class="nav-social" aria-label="Aho Farms on social media">
          ${SOCIAL.map(s => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(s.name)}">${s.icon}</a></li>`).join('')}
        </ul>
        <a href="${esc(CTA.href)}" class="nav-cta-wrap" aria-label="${esc(CTA.en)}">${label(CTA)}</a>
        <button class="nav-burger" aria-expanded="false" aria-controls="navDrawer" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>`, prefixFor(currentPage));
}

module.exports = { renderNav, relativize, prefixFor };

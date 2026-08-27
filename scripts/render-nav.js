const { NAV, CTA } = require('./nav-config');

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

function renderNav(currentPage) {
  // Which parent owns the current page? Defaults to Learn (index 0).
  // First match wins (not last) - e.g. on the homepage, Learn's and Buy's
  // children both resolve to index.html, and Learn (index 0) must win.
  let activeIdx = 0;
  const foundIdx = NAV.findIndex((p) =>
    p.children.some(c => isActive(c.href, currentPage)) || isActive(p.href, currentPage)
  );
  if (foundIdx !== -1) activeIdx = foundIdx;
  // A childless parent cannot populate the bar - fall back to Learn.
  if (!NAV[activeIdx].children.length) activeIdx = 0;

  // Each parent's children render as a <ul class="nav-sub"> INSIDE that
  // parent's own <li>, once. This is the single source for both the desktop
  // click-to-open dropdown panel and the mobile accordion - no second bar,
  // no runtime cloning. Closed by default; JS toggles the `hidden` attribute.
  const parents = NAV.map((p, i) => {
    const hasKids = p.children.length > 0;
    const caret = hasKids ? '<span class="nav-caret" aria-hidden="true"></span>' : '';
    const hasKidsAttr = hasKids ? ' data-haskids="1"' : '';
    const subId = `navSub${i}`;
    const aExtra = hasKids ? ` aria-expanded="false" aria-controls="${subId}"` : '';
    const sub = hasKids
      ? `\n          <ul class="nav-sub" id="${subId}" hidden>\n            ${p.children.map(c =>
          `<li><a href="${esc(c.href)}" aria-label="${esc(c.en)}">${label(c)}</a></li>`
        ).join('\n            ')}\n          </ul>`
      : '';
    return `<li class="nav-parent${i === activeIdx ? ' is-active' : ''}"${hasKidsAttr} data-idx="${i}">` +
           `<a href="${esc(p.href)}" aria-label="${esc(p.en)}"${aExtra}>${label(p)}${caret}</a>${sub}</li>`;
  }).join('\n        ');

  return `<nav class="nav" id="nav" aria-label="Main">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">AHO <em>FARMS</em></a>
      <ul class="nav-links" id="navDrawer">
        ${parents}
      </ul>
      <div class="nav-right">
        <a href="${esc(CTA.href)}" class="nav-cta-wrap" aria-label="${esc(CTA.en)}">${label(CTA)}</a>
        <button class="nav-burger" aria-expanded="false" aria-controls="navDrawer" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>`;
}

module.exports = { renderNav };

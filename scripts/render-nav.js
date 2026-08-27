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

  const parents = NAV.map((p, i) => {
    const caret = p.children.length ? '<span class="nav-caret" aria-hidden="true"></span>' : '';
    const hasKids = p.children.length ? ' data-haskids="1"' : '';
    return `<li class="nav-parent${i === activeIdx ? ' is-active' : ''}"${hasKids} data-idx="${i}">` +
           `<a href="${esc(p.href)}" aria-label="${esc(p.en)}">${label(p)}${caret}</a></li>`;
  }).join('\n        ');

  const bars = NAV.map((p, i) => {
    if (!p.children.length) return '';
    const kids = p.children.map(c =>
      `<li><a href="${esc(c.href)}" aria-label="${esc(c.en)}">${label(c)}</a></li>`
    ).join('\n            ');
    return `<ul class="nav-sub" data-for="${i}"${i === activeIdx ? '' : ' hidden'}>\n            ${kids}\n          </ul>`;
  }).filter(Boolean).join('\n          ');

  return `<nav class="nav" id="nav" aria-label="Main">
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">AHO <em>FARMS</em></a>
      <button class="nav-burger" aria-expanded="false" aria-controls="navDrawer" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navDrawer">
        ${parents}
        <li class="nav-cta-wrap"><a href="${esc(CTA.href)}" aria-label="${esc(CTA.en)}">${label(CTA)}</a></li>
      </ul>
    </div>
    <div class="nav-bar2">
      <div class="nav-bar2-inner">
          ${bars}
      </div>
    </div>
  </nav>`;
}

module.exports = { renderNav };

/* AHO FARMS · shared chrome behaviour
   Loaded deferred on every page. Owns the header (scroll veil, mobile
   drawer, desktop dropdown), the shared starfield, and the floating
   "Connect with us" button and its sheet. Everything is guarded so a
   page without the markup is a no-op, and nothing here depends on page
   scripts. Since 2026-09-14 no page carries its own copy of the nav
   script. */
(function () {
  'use strict';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DRAWER_MQ = window.matchMedia('(max-width: 900px)');

  /* ---------- header: veil once scrolled ---------- */
  var nav = document.getElementById('nav');
  if (nav) {
    var veil = function () { nav.classList.toggle('scrolled', window.scrollY > 60); };
    window.addEventListener('scroll', veil, { passive: true });
    veil();
  }

  /* ---------- header: signed-in state ----------
     A visitor with a portal session carries a UI-hint cookie (role only;
     the real session is HttpOnly and verified server-side). The Portals
     item becomes "My Portal": portal home, account, sign out. Admins see
     every portal. Runs before the drawer and dropdown are wired so both
     pick up the rebuilt list. */
  if (nav) (function () {
    var m = document.cookie.match(/(?:^|;\s*)aho_portal_ui=([^;]*)/);
    var li = nav.querySelector('.nav-parent[data-key="portals"]');
    if (!m || !li) return;
    var role = decodeURIComponent(m[1]);
    var ALL = [['prescriber', 'Prescriber Portal'], ['pharmacy', 'Pharmacy Portal'], ['export-partner', 'Export Partner Portal']];
    var BY_ROLE = { prescriber: ALL[0], pharmacy: ALL[1], export_partner: ALL[2] };
    var mine = role === 'admin' ? ALL : (BY_ROLE[role] ? [BY_ROLE[role]] : []);
    if (!mine.length) return;
    var a = li.querySelector(':scope > a'), sub = li.querySelector(':scope > .nav-sub');
    if (!a || !sub) return;
    function bil(en, mi) { return '<span class="bil"><span class="bil-en">' + en + '</span><span class="bil-mi" aria-hidden="true">' + mi + '</span></span>'; }
    var caret = a.querySelector('.nav-caret');
    a.innerHTML = bil('My Portal', 'Tōku Tomokanga') + (caret ? caret.outerHTML : '');
    a.setAttribute('aria-label', 'My Portal');
    a.setAttribute('href', '/portal/' + mine[0][0] + '/home.html');
    var items = mine.map(function (p) { return [mine.length > 1 ? p[1] : 'Portal home', mine.length > 1 ? p[1] : 'Kāinga', '/portal/' + p[0] + '/home.html', '']; });
    items.push(['Account', 'Pūkete', '/portal/' + mine[0][0] + '/account.html', '']);
    items.push(['Sign out', 'Puta atu', '/portal/', ' data-signout']);
    sub.innerHTML = items.map(function (it) {
      return '<li><a href="' + it[2] + '" aria-label="' + it[0] + '"' + it[3] + '>' + bil(it[0], it[1]) + '</a></li>';
    }).join('');
    li.classList.add('is-signed-in');
  })();

  /* ---------- sign out (header item, portal page buttons) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-signout]') : null;
    if (!t) return;
    e.preventDefault();
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
      .catch(function () {})
      .then(function () {
        try { sessionStorage.removeItem('aho:me'); } catch (err) {}
        var m = location.pathname.match(/^\/portal\/([^/]+)\/(home|account)\.html/);
        if (m) location.href = '/portal/' + m[1] + '/login.html?notice=signed-out';
        else location.reload();
      });
  });

  /* ---------- header: mobile drawer ----------
     Accordion (CEO, 2026-09-22): the drawer opens on the top-level items
     only; tapping Learn, Products or Portals expands that group (one open
     at a time) and tapping again collapses it. The parent keeps its href
     for no-JS and crawlers; in drawer mode the tap only toggles. */
  if (nav) (function () {
    var burger = nav.querySelector('.nav-burger');
    var links = nav.querySelector('.nav-links');
    if (!burger || !links) return;
    var parents = Array.prototype.slice.call(nav.querySelectorAll('.nav-parent[data-haskids]'));
    var subs = nav.querySelectorAll('.nav-parent .nav-sub');

    function setExpanded(li, open) {
      var a = li.querySelector(':scope > a'), sub = li.querySelector(':scope > .nav-sub');
      if (!a || !sub) return;
      li.classList.toggle('is-expanded', open);
      a.setAttribute('aria-expanded', String(open));
      sub.style.maxHeight = open ? sub.scrollHeight + 'px' : '0px';
    }
    function collapseAll(except) { parents.forEach(function (li) { if (li !== except) setExpanded(li, false); }); }

    // In drawer mode every panel is part of the list (collapsed until
    // tapped); [hidden] and inline heights belong to one mode each.
    function syncMode() {
      if (DRAWER_MQ.matches) {
        subs.forEach(function (s) { s.hidden = false; s.classList.remove('is-open'); });
        collapseAll();
      } else {
        closeDrawer();
        subs.forEach(function (s) { s.hidden = true; s.classList.remove('is-open'); s.style.maxHeight = ''; });
        parents.forEach(function (li) { li.classList.remove('is-expanded'); var a = li.querySelector(':scope > a'); if (a) a.setAttribute('aria-expanded', 'false'); });
      }
    }
    function closeDrawer() {
      links.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      if (DRAWER_MQ.matches) collapseAll();
    }
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (!open) collapseAll();
    });
    parents.forEach(function (li) {
      var a = li.querySelector(':scope > a');
      if (!a) return;
      a.addEventListener('click', function (e) {
        if (!DRAWER_MQ.matches) return;
        e.preventDefault();
        var open = !li.classList.contains('is-expanded');
        collapseAll(li);
        setExpanded(li, open);
      });
    });
    // Crossing the breakpoint with the drawer open would strand body
    // scroll locked - force it closed and re-sync the panels.
    DRAWER_MQ.addEventListener('change', syncMode);
    nav.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) { closeDrawer(); burger.focus(); }
    });
    // Mark the page we are on inside the list.
    var here = location.pathname.split('/').pop() || 'index.html';
    links.querySelectorAll('.nav-sub a').forEach(function (a) {
      if (a.getAttribute('href').split('#')[0].split('/').pop() === here) a.setAttribute('aria-current', 'page');
    });
    syncMode();
  })();

  /* ---------- header: desktop dropdown ----------
     Hover, focus and click open a parent's own nested panel and close the
     others. A parent keeps its href for no-JS and crawlers; in dropdown
     mode its click is intercepted. Not wired at all in drawer mode. */
  if (nav) (function () {
    var parents = Array.prototype.slice.call(nav.querySelectorAll('.nav-parent[data-haskids]'));
    if (!parents.length) return;
    var hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var CLOSE_DELAY = 200;
    var closeTimer = null;
    var dropdownMode = function () { return !DRAWER_MQ.matches; };

    function cancelScheduledClose() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } }
    function openPanel(li) {
      var a = li.querySelector(':scope > a'), sub = li.querySelector(':scope > .nav-sub');
      if (!a || !sub) return;
      closeAll(li);
      sub.hidden = false; sub.classList.add('is-open'); li.classList.add('is-expanded');
      a.setAttribute('aria-expanded', 'true');
    }
    function closePanel(li) {
      var a = li.querySelector(':scope > a'), sub = li.querySelector(':scope > .nav-sub');
      if (!sub || sub.hidden) return;
      sub.hidden = true; sub.classList.remove('is-open'); li.classList.remove('is-expanded');
      if (a) a.setAttribute('aria-expanded', 'false');
    }
    function closeAll(except) { parents.forEach(function (li) { if (li !== except) closePanel(li); }); }
    function scheduleClose(li) { cancelScheduledClose(); closeTimer = setTimeout(function () { closePanel(li); closeTimer = null; }, CLOSE_DELAY); }

    parents.forEach(function (li) {
      var a = li.querySelector(':scope > a'), sub = li.querySelector(':scope > .nav-sub');
      if (!a || !sub) return;
      a.addEventListener('click', function (e) {
        if (!dropdownMode()) return;
        e.preventDefault();
        var wasOpen = !sub.hidden;
        cancelScheduledClose();
        if (wasOpen) closePanel(li); else openPanel(li);
      });
      if (hoverCapable) {
        li.addEventListener('mouseenter', function () { if (!dropdownMode()) return; cancelScheduledClose(); openPanel(li); });
        li.addEventListener('mouseleave', function () { if (!dropdownMode()) return; scheduleClose(li); });
      }
      a.addEventListener('focus', function () { if (!dropdownMode()) return; cancelScheduledClose(); openPanel(li); });
      li.addEventListener('focusout', function (e) {
        if (!dropdownMode()) return;
        if (li.contains(e.relatedTarget)) return;
        closePanel(li);
      });
    });
    document.addEventListener('click', function (e) { if (dropdownMode() && !nav.contains(e.target)) closeAll(); });
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !dropdownMode()) return;
      var openLi = parents.filter(function (li) { var s = li.querySelector(':scope > .nav-sub'); return s && !s.hidden; })[0];
      if (!openLi) return;
      var refocus = openLi.contains(document.activeElement);
      cancelScheduledClose(); closeAll();
      if (refocus) { var t = openLi.querySelector(':scope > a'); if (t) t.focus(); }
    });
  })();

  /* ---------- starfields: points of light, generated, never identical ----------
     Skipped for a field that a page script has already populated. */
  if (!REDUCED) {
    var small = window.innerWidth < 900;
    document.querySelectorAll('.starfield').forEach(function (f) {
      if (f.childElementCount) return;
      var n = small ? Math.round((+f.dataset.stars || 24) * 0.5) : (+f.dataset.stars || 24);
      var seed = n * 7 + 13;
      var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      var frag = document.createDocumentFragment();
      for (var i = 0; i < n; i++) {
        var s = document.createElement('span');
        s.className = 'st' + (rnd() < 0.3 ? ' blue' : '');
        var size = rnd() < 0.12 ? 3 + rnd() * 2 : 1 + rnd() * 2;
        s.style.width = s.style.height = size.toFixed(1) + 'px';
        s.style.left = (rnd() * 100).toFixed(2) + '%';
        s.style.top = (rnd() * 100).toFixed(2) + '%';
        s.style.setProperty('--tw', (3.5 + rnd() * 5).toFixed(1) + 's');
        s.style.setProperty('--td', (-rnd() * 8).toFixed(1) + 's');
        s.style.setProperty('--o1', (0.1 + rnd() * 0.25).toFixed(2));
        s.style.setProperty('--o2', (0.5 + rnd() * 0.5).toFixed(2));
        frag.appendChild(s);
      }
      f.appendChild(frag);
    });
  }

  /* ---------- floating "Connect with us" ---------- */
  var connect = document.querySelector('.aho-connect');
  var sheet = document.querySelector('.aho-sheet');
  if (!connect || !sheet) return;

  var btn = connect.querySelector('.aho-connect-btn');
  var closeBtn = sheet.querySelector('.aho-sheet-close');
  var panel = sheet.querySelector('.aho-sheet-panel');
  var lastFocus = null;

  // Show the button once the visitor has started scrolling. Hidden at the
  // very top so the hero stays clean, and while the sheet is open.
  var shown = false;
  function update() {
    var want = window.scrollY > 240 && !sheet.classList.contains('is-open');
    if (want !== shown) { shown = want; connect.classList.toggle('is-shown', want); }
  }
  window.addEventListener('scroll', update, { passive: true });
  update();

  // Mark the option that points at the page we are on.
  var here = location.pathname.split('/').pop() || 'index.html';
  sheet.querySelectorAll('.aho-sheet-list a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.classList.add('is-current');
  });

  function focusables() {
    return Array.prototype.slice.call(panel.querySelectorAll('a[href],button:not([disabled])'));
  }
  function open() {
    lastFocus = document.activeElement;
    sheet.classList.add('is-open');
    sheet.removeAttribute('aria-hidden');
    document.body.classList.add('aho-sheet-open');
    btn.setAttribute('aria-expanded', 'true');
    update();
    var first = sheet.querySelector('.aho-sheet-list a');
    window.setTimeout(function () { (first || closeBtn).focus(); }, REDUCED ? 0 : 120);
  }
  function close() {
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('aho-sheet-open');
    btn.setAttribute('aria-expanded', 'false');
    update();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
  document.addEventListener('keydown', function (e) {
    if (!sheet.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      var f = focusables(); if (!f.length) return;
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
})();

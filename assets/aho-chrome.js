/* AHO FARMS · shared chrome behaviour
   Loaded deferred on every page. Owns only the floating "Connect with us"
   button and its sheet; the nav's own drawer/dropdown script stays with
   the nav. Everything is guarded so a page without the markup is a no-op. */
(function () {
  'use strict';
  var connect = document.querySelector('.aho-connect');
  var sheet = document.querySelector('.aho-sheet');
  if (!connect || !sheet) return;

  var btn = connect.querySelector('.aho-connect-btn');
  var closeBtn = sheet.querySelector('.aho-sheet-close');
  var panel = sheet.querySelector('.aho-sheet-panel');
  var lastFocus = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    window.setTimeout(function () { (first || closeBtn).focus(); }, reduce ? 0 : 120);
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

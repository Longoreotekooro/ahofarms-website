/* AHO FARMS · portal pages
   Sign-in, request access, forgot / reset password, the dashboard
   framework and the account page. The page declares itself with
   <body data-portal="..." data-page="..."> and this script wires only
   what is present. Sign-out links are handled by aho-chrome.js
   ([data-signout]) so they work from the header on every page. */
(function () {
  'use strict';
  var body = document.body;
  var portal = body.getAttribute('data-portal') || '';
  var page = body.getAttribute('data-page') || '';
  var params = new URLSearchParams(location.search);

  function api(path, data, method) {
    return fetch(path, {
      method: method || 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'same-origin',
      body: data ? JSON.stringify(data) : undefined,
    }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Something went wrong. Please try again.' }; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function () { return { ok: false, error: 'We could not reach Aho Farms. Check your connection and try again.' }; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function show(msgEl, text, kind) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.className = 'pt-msg pt-msg--' + (kind || 'note');
    msgEl.hidden = !text;
    if (text && kind === 'error') msgEl.focus && msgEl.focus();
  }
  function busy(form, on, label) {
    var btn = form.querySelector('button[type="submit"]');
    form.classList.toggle('is-busy', on);
    if (!btn) return;
    btn.disabled = on;
    var lab = btn.querySelector('.pt-btn-label');
    if (!lab) return;
    if (on) { btn.dataset.idle = lab.textContent; lab.textContent = label || 'One moment'; var s = el('span', 'pt-spin'); s.setAttribute('aria-hidden', 'true'); btn.insertBefore(s, lab); }
    else { lab.textContent = btn.dataset.idle || lab.textContent; var sp = btn.querySelector('.pt-spin'); if (sp) sp.remove(); }
  }
  function setFieldError(form, name, text) {
    var input = form.querySelector('[name="' + name + '"]');
    if (!input) return;
    var field = input.closest('.field');
    var err = field && field.querySelector('.pt-field-error');
    if (field) field.classList.toggle('is-invalid', !!text);
    if (err) err.textContent = text || '';
    if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function clearFieldErrors(form) {
    form.querySelectorAll('.field.is-invalid').forEach(function (f) { f.classList.remove('is-invalid'); });
    form.querySelectorAll('.pt-field-error').forEach(function (e) { e.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
  }
  // Client-side validation mirrors the server's: required, email shape, select options.
  function validate(form) {
    clearFieldErrors(form);
    var first = null;
    form.querySelectorAll('[data-required], [type="email"]').forEach(function (input) {
      var v = (input.value || '').trim(), msg = '';
      var label = (form.querySelector('label[for="' + input.id + '"]') || {}).textContent || 'This field';
      if (input.type === 'checkbox') { if (input.hasAttribute('data-required') && !input.checked) msg = 'This confirmation is required.'; }
      else if (input.hasAttribute('data-required') && !v) msg = label.replace(/\s*\*$/, '') + ' is required.';
      else if (input.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'Enter a valid email address.';
      if (msg) { setFieldError(form, input.name, msg); if (!first) first = input; }
    });
    if (first) first.focus();
    return !first;
  }
  function formData(form) {
    var out = {};
    new FormData(form).forEach(function (v, k) { out[k] = typeof v === 'string' ? v : ''; });
    form.querySelectorAll('input[type="checkbox"]').forEach(function (c) { out[c.name] = c.checked; });
    return out;
  }

  /* show / hide password */
  document.querySelectorAll('.pt-pw-toggle').forEach(function (btn) {
    var input = btn.parentNode.querySelector('input');
    btn.addEventListener('click', function () {
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? 'Show' : 'Hide';
      btn.setAttribute('aria-pressed', String(!showing));
      input.focus();
    });
  });

  /* ---------- sign in ---------- */
  var loginForm = document.getElementById('ptLogin');
  if (loginForm) {
    var msg = loginForm.querySelector('.pt-msg');
    if (params.get('notice') === 'signed-out') show(msg, 'You have been signed out.', 'ok');
    if (params.get('notice') === 'expired') show(msg, 'Your session has ended. Please sign in again.', 'note');
    if (params.get('next')) show(msg, 'Please sign in to continue to that page.', 'note');
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      show(msg, '');
      if (!validate(loginForm)) return;
      var data = formData(loginForm);
      data.portal = portal;
      data.next = params.get('next') || '';
      busy(loginForm, true, 'Signing in');
      api('/api/auth/login', data).then(function (r) {
        if (r.ok) {
          busy(loginForm, true, 'Opening your portal');
          try { sessionStorage.removeItem('aho:me'); } catch (err) {}
          location.replace(r.redirect || ('/portal/' + portal + '/home'));
          return;
        }
        busy(loginForm, false);
        show(msg, r.error || 'Sign in failed. Please try again.', 'error');
        if (r.redirect) {
          var a = el('a', 'pt-link', 'Go to the right sign-in page');
          a.href = r.redirect; msg.appendChild(document.createTextNode(' ')); msg.appendChild(a);
        }
        var pw = loginForm.querySelector('[name="password"]');
        if (pw && r.status === 401) { pw.value = ''; pw.focus(); }
      });
    });
  }

  /* ---------- forgot password ---------- */
  var forgotForm = document.getElementById('ptForgot');
  if (forgotForm) {
    var fmsg = forgotForm.querySelector('.pt-msg');
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      show(fmsg, '');
      if (!validate(forgotForm)) return;
      var data = formData(forgotForm); data.portal = portal;
      busy(forgotForm, true, 'Sending');
      api('/api/auth/forgot', data).then(function (r) {
        busy(forgotForm, false);
        if (r.ok) { show(fmsg, r.message, 'ok'); forgotForm.querySelector('button[type="submit"]').disabled = true; }
        else show(fmsg, r.error, 'error');
      });
    });
  }

  /* ---------- set / reset password ---------- */
  var resetForm = document.getElementById('ptReset');
  if (resetForm) {
    var rmsg = resetForm.querySelector('.pt-msg');
    var token = params.get('token') || '';
    if (!token) { show(rmsg, 'This page needs the link from your email. If it has expired, request a new one below.', 'note'); }
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      show(rmsg, '');
      if (!validate(resetForm)) return;
      var data = formData(resetForm);
      if (data.password !== data.confirm) { setFieldError(resetForm, 'confirm', 'The two passwords do not match.'); resetForm.querySelector('[name="confirm"]').focus(); return; }
      busy(resetForm, true, 'Saving');
      api('/api/auth/reset', { token: token, password: data.password }).then(function (r) {
        if (r.ok) {
          busy(resetForm, true, 'Saved');
          show(rmsg, r.message + ' Taking you to sign in.', 'ok');
          setTimeout(function () { location.href = r.redirect || ('/portal/' + portal + '/login'); }, 1600);
          return;
        }
        busy(resetForm, false);
        show(rmsg, r.error, 'error');
      });
    });
  }

  /* ---------- request access ---------- */
  var reqForm = document.getElementById('ptRequest');
  if (reqForm) {
    var qmsg = reqForm.querySelector('.pt-msg');
    reqForm.addEventListener('submit', function (e) {
      e.preventDefault();
      show(qmsg, '');
      if (!validate(reqForm)) return;
      var data = formData(reqForm); data.portal = portal;
      busy(reqForm, true, 'Sending your request');
      api('/api/access/request', data).then(function (r) {
        busy(reqForm, false);
        if (r.ok) {
          var wrap = el('div', 'pt-success');
          var tick = el('div', 'pt-tick'); tick.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
          wrap.appendChild(tick);
          wrap.appendChild(el('h2', null, 'Request received.'));
          wrap.appendChild(el('p', null, r.message || 'Thank you. Aho Farms will review your request and be in touch by email.'));
          var p = el('p'); var back = el('a', 'pt-link', 'Back to sign in'); back.href = '/portal/' + portal + '/login'; p.appendChild(back); wrap.appendChild(p);
          reqForm.replaceWith(wrap);
          wrap.setAttribute('tabindex', '-1'); wrap.focus();
          window.scrollTo({ top: wrap.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
          return;
        }
        if (r.fields) { Object.keys(r.fields).forEach(function (k) { setFieldError(reqForm, k, r.fields[k]); }); var f = reqForm.querySelector('.field.is-invalid input, .field.is-invalid select, .field.is-invalid textarea'); if (f) f.focus(); }
        show(qmsg, r.error || 'We could not send your request. Please try again.', 'error');
      });
    });
  }

  /* ---------- dashboard ---------- */
  var dash = document.getElementById('ptSections');
  if (dash) {
    var ICONS = {
      product: '<svg viewBox="0 0 24 24"><path d="M12 3v18M12 21c-3-2-5-5-5-8s2-6 5-8c3 2 5 5 5 8s-2 6-5 8z"/></svg>',
      document: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg>',
      data: '<svg viewBox="0 0 24 24"><path d="M4 19h16M7 16V9M12 16V5M17 16v-6"/></svg>',
      guide: '<svg viewBox="0 0 24 24"><path d="M4 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z"/></svg>',
      update: '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8"/></svg>',
      contact: '<svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><path d="M4 7l8 6 8-6"/></svg>',
    };
    function card(item) {
      var isLink = item.status === 'available' && item.href;
      var c = el(isLink ? 'a' : 'div', 'card' + (isLink ? '' : ' is-coming') + (item.specs ? ' card--wide' : ''));
      if (isLink) { c.href = item.href; if (/\.pdf(\?|$)/i.test(item.href)) { c.target = '_blank'; c.rel = 'noopener'; } }
      var top = el('div', 'pt-card-top');
      var icon = el('span', 'pt-card-icon'); icon.innerHTML = ICONS[item.kind] || ICONS.document; icon.setAttribute('aria-hidden', 'true');
      top.appendChild(icon);
      top.appendChild(el('span', 'pt-chip' + (isLink ? '' : ' pt-chip--muted'), isLink ? 'Available' : 'Coming soon'));
      c.appendChild(top);
      c.appendChild(el('h3', null, item.title));
      if (item.meta) c.appendChild(el('p', 'pt-card-meta', item.meta));
      if (item.note) c.appendChild(el('p', null, item.note));
      if (item.specs && item.specs.length) {
        var dl = el('dl', 'pt-specs');
        item.specs.forEach(function (sp) { dl.appendChild(el('dt', null, sp[0])); dl.appendChild(el('dd', null, sp[1])); });
        c.appendChild(dl);
      }
      if (isLink) c.appendChild(el('span', 'pt-card-action', item.action || 'Open'));
      return c;
    }
    function render(d) {
      var name = document.querySelector('[data-user-name]'); if (name) name.textContent = d.user.name || d.user.email;
      var org = document.querySelector('[data-user-org]'); if (org) org.textContent = d.user.org || '—';
      var em = document.querySelector('[data-user-email]'); if (em) em.textContent = d.user.email;
      var lead = document.querySelector('[data-dash-lead]'); if (lead) lead.textContent = d.lead || '';
      var hl = document.querySelector('[data-dash-headline]'); if (hl) { hl.textContent = d.headline || ''; hl.hidden = !d.headline; }
      var jump = document.getElementById('ptJump');
      dash.innerHTML = '';
      if (jump) jump.innerHTML = '';
      d.sections.forEach(function (s, i) {
        if (jump) { var a = el('a', 'pt-pill', s.nav || s.title); a.href = '#' + s.id; jump.appendChild(a); }
        var sec = el('section', 'pt-plate pt-sec ' + (i % 2 === 0 ? 'plate--flax' : 'pt-sec--ink'));
        sec.id = s.id;
        var inner = el('div', 'pt-sec-inner');
        var copy = el('div', 'pt-sec-copy');
        copy.appendChild(el('span', 'eyebrow eyebrow--rule', s.eyebrow));
        copy.appendChild(el('h2', null, s.title));
        if (s.lead) copy.appendChild(el('p', null, s.lead));
        var cards = el('div', 'pt-cards');
        s.items.forEach(function (it) { cards.appendChild(card(it)); });
        inner.appendChild(copy); inner.appendChild(cards); sec.appendChild(inner);
        dash.appendChild(sec);
      });
      if (jump) { var sp = el('a', 'pt-pill', 'Support'); sp.href = '#support'; jump.appendChild(sp); }
      var sup = document.getElementById('support');
      if (sup && d.portal.support) {
        var mail = sup.querySelector('[data-support-mail]');
        if (mail) { mail.href = 'mailto:' + d.portal.support.email; mail.textContent = d.portal.support.email; }
      }
      if (params.get('notice') === 'wrong-portal') {
        var n = el('p', 'pt-msg pt-msg--note', 'That link was for a different portal. Your access is to the ' + d.portal.name + ', shown here.');
        n.setAttribute('role', 'status');
        dash.insertBefore(n, dash.firstChild); n.style.margin = '0 var(--plate-g) var(--plate-g)';
      }
      body.classList.add('pt-loaded');
    }
    api('/api/portal/home?portal=' + encodeURIComponent(portal), null, 'GET').then(function (r) {
      if (r.ok) return render(r);
      dash.innerHTML = '';
      var st = el('div', 'pt-state');
      var m = el('p', 'pt-msg pt-msg--' + (r.status === 401 ? 'note' : 'error'), r.error || 'The portal could not be loaded.');
      st.appendChild(m);
      if (r.status === 401) { var a = el('a', 'pt-link', 'Sign in again'); a.href = '/portal/' + portal + '/login?notice=expired'; st.appendChild(a); }
      dash.appendChild(st);
    });
  }

  /* ---------- account ---------- */
  var acct = document.getElementById('ptAccount');
  if (acct) {
    api('/api/auth/me', null, 'GET').then(function (r) {
      if (!r.ok || !r.authenticated) { location.replace('/portal/' + portal + '/login?notice=expired'); return; }
      var map = { name: r.user.name, email: r.user.email, org: r.user.org || '—', role: r.user.role.replace('_', ' ') };
      Object.keys(map).forEach(function (k) { var t = acct.querySelector('[data-user-' + k + ']'); if (t) t.textContent = map[k]; });
    });
    var pwForm = document.getElementById('ptPassword');
    if (pwForm) {
      var pmsg = pwForm.querySelector('.pt-msg');
      pwForm.addEventListener('submit', function (e) {
        e.preventDefault();
        show(pmsg, '');
        if (!validate(pwForm)) return;
        var data = formData(pwForm);
        if (data.password !== data.confirm) { setFieldError(pwForm, 'confirm', 'The two passwords do not match.'); return; }
        busy(pwForm, true, 'Saving');
        api('/api/auth/change-password', { current: data.current, password: data.password }).then(function (r) {
          busy(pwForm, false);
          if (r.ok) { show(pmsg, r.message, 'ok'); pwForm.reset(); } else show(pmsg, r.error, 'error');
        });
      });
    }
  }

  /* ---------- consumer portal: get connected to a prescriber ----------
     Lead capture first; the partner's next step (tracked link + QR code,
     or a call-back) is shown only after a successful submission. */
  var connect = document.getElementById('csConnect');
  if (connect) {
    var cmsg = connect.querySelector('.pt-msg');
    var countrySel = document.getElementById('cs-country');
    var regionList = document.getElementById('csRegionList');
    var REGIONS = {
      'New Zealand': ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay", 'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland'],
      'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory'],
      'Germany': ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia'],
      'United Kingdom': ['London', 'South East', 'South West', 'East of England', 'East Midlands', 'West Midlands', 'Yorkshire and the Humber', 'North West', 'North East', 'Scotland', 'Wales', 'Northern Ireland']
    };
    function fillRegions() {
      if (!regionList) return;
      regionList.innerHTML = '';
      (REGIONS[countrySel.value] || []).forEach(function (r) { var o = document.createElement('option'); o.value = r; regionList.appendChild(o); });
    }
    if (countrySel) { countrySel.addEventListener('change', fillRegions); fillRegions(); }
    // Acquisition source: campaign parameters and the referring page, so
    // the lead records where it came from (QR codes, social, partners, ads).
    try {
      var src = params.get('utm_source') || params.get('source') || params.get('ref') || '';
      var camp = [params.get('utm_campaign'), params.get('utm_medium'), params.get('utm_content')].filter(Boolean).join(' / ');
      var srcIn = connect.querySelector('[name="source"]'), campIn = connect.querySelector('[name="campaign"]'), refIn = connect.querySelector('[name="referrer"]');
      if (srcIn && src) srcIn.value = 'consumer-portal · ' + src.slice(0, 60);
      if (campIn) campIn.value = camp.slice(0, 120);
      if (refIn && document.referrer && document.referrer.indexOf(location.host) < 0) refIn.value = document.referrer.slice(0, 300);
    } catch (err) {}
    if (params.get('notice') === 'referral-unknown') show(cmsg, 'That referral link was not recognised. Submit the form again and we will give you a fresh one.', 'note');

    function qrSvg(text) {
      try {
        if (typeof qrcode !== 'function') return null;
        var q = qrcode(0, 'M'); q.addData(text); q.make();
        var n = q.getModuleCount(), cell = 4, size = n * cell;
        var d = '';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c * cell) + ' ' + (r * cell) + 'h' + cell + 'v' + cell + 'h-' + cell + 'z';
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size); svg.setAttribute('shape-rendering', 'crispEdges'); svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'QR code for your referral link');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#0b0d0f');
        svg.appendChild(path);
        return svg;
      } catch (e) { return null; }
    }
    function renderResult(r) {
      var box = el('div', 'pt-form pt-form--light cs-result');
      var head = el('div', 'cs-result-head');
      var tick = el('div', 'pt-tick'); tick.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';
      head.appendChild(tick);
      head.appendChild(el('h3', null, 'Thank you'));
      var lead = el('p', 'cs-result-lead'); lead.innerHTML = '<b>Your enquiry has been received.</b> We\'ve captured your details and will help connect you with the appropriate independent healthcare pathway for your region.';
      head.appendChild(lead);
      head.appendChild(el('p', null, r.message));
      box.appendChild(head);
      var ref = r.referral;
      if (ref.status === 'referred') {
        var card = el('div', 'cs-result-partner');
        var left = el('div');
        left.appendChild(el('span', 'eyebrow', 'Your prescriber partner'));
        left.appendChild(el('b', null, ref.partnerName));
        if (ref.intro) left.appendChild(el('p', null, ref.intro));
        if (ref.link) {
          var row = el('div', 'btn-row');
          var go = el('a', 'btn btn--primary', 'Continue to Prescriber');
          go.href = ref.link; go.target = '_blank'; go.rel = 'noopener';
          row.appendChild(go); left.appendChild(row);
        }
        card.appendChild(left);
        if (ref.link) {
          var qrWrap = el('div');
          var qr = el('div', 'cs-qr');
          var svg = qrSvg(ref.link);
          if (svg) qr.appendChild(svg); else qr.appendChild(el('span', null, ref.link));
          qrWrap.appendChild(qr);
          qrWrap.appendChild(el('span', 'cs-qr-label', 'Scan to continue'));
          card.appendChild(qrWrap);
        }
        box.appendChild(card);
        var refLine = el('p', 'cs-result-ref'); refLine.innerHTML = 'Your reference: <code></code>' + (ref.introEmailed ? ' · A copy has been emailed to you.' : ' · Keep this code; quote it if you contact us.');
        refLine.querySelector('code').textContent = ref.code;
        box.appendChild(refLine);
      }
      if (ref.status !== 'referred') box.appendChild(el('p', 'cs-result-lead', 'Our team will contact you with the appropriate next step.'));
      box.appendChild(el('p', null, 'Clinical suitability and prescribing decisions remain with the independent healthcare professional. Aho Farms does not prescribe, diagnose or guarantee access to medicinal cannabis or a prescription.'));
      connect.replaceWith(box);
      box.setAttribute('tabindex', '-1'); box.focus();
      window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
    }
    connect.addEventListener('submit', function (e) {
      e.preventDefault();
      show(cmsg, '');
      clearFieldErrors(connect);
      var ok = validate(connect);
      var age = connect.querySelector('[name="ageConfirmed"]');
      if (age && !age.checked) { setFieldError(connect, 'ageConfirmed', 'Please confirm you meet the age requirement.'); if (ok) age.focus(); ok = false; }
      var consent = connect.querySelector('[name="consentReferral"]');
      if (consent && !consent.checked) { setFieldError(connect, 'consentReferral', 'We need your consent to store your details and pass them to a prescriber partner.'); if (ok) consent.focus(); ok = false; }
      if (!ok) return;
      var data = formData(connect); data.source = 'consumer-portal';
      busy(connect, true, 'Connecting you');
      api('/api/consumers/connect', data).then(function (r) {
        busy(connect, false);
        if (r.ok) return renderResult(r);
        if (r.fields) { Object.keys(r.fields).forEach(function (k) { setFieldError(connect, k, r.fields[k]); }); var f = connect.querySelector('.field.is-invalid input, .field.is-invalid select, .field.is-invalid textarea'); if (f) f.focus(); }
        show(cmsg, r.error || 'We could not send your enquiry. Please try again.', 'error');
      });
    });
  }

  /* ---------- hub: point signed-in visitors at their portal ---------- */
  var hub = document.getElementById('ptHubSigned');
  if (hub) {
    var m = document.cookie.match(/(?:^|;\s*)aho_portal_ui=([^;]*)/);
    if (m) {
      var role = decodeURIComponent(m[1]);
      var ids = { prescriber: 'prescriber', pharmacy: 'pharmacy', export_partner: 'export-partner' };
      var id = ids[role];
      hub.hidden = false;
      var link = hub.querySelector('a');
      if (id && link) { link.href = '/portal/' + id + '/home'; }
      else if (link) { link.textContent = 'You are signed in as an administrator: open any portal above.'; link.removeAttribute('href'); }
    }
  }
})();

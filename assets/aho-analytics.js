/* Public-page GTM installation. Publish the reviewed container before merge.
   Standard automatic GA4 page views; no direct GA loader or noscript tracker. */
(function () {
  'use strict';
  // Release ordering and account checks: docs/analytics-readiness.md.
  var RELEASED = true;
  var DEFAULT_ON = true;
  var ID = 'G-3MS8DHXLX7';
  var KEY = 'aho-analytics-choice-v1';
  var pages = ['/', '/about', '/contact', '/cultivation', '/disclaimer',
    '/export-partners', '/news', '/origins', '/privacy', '/products',
    '/quality', '/social-impact', '/team', '/terms', '/tohu', '/whats-new',
    '/news/innovation-extraction', '/news/kaitiakitanga-land-wellness',
    '/news/sustainable-sun-grown'];
  var path = location.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/');
  if (pages.indexOf(path) === -1) return;
  var choice = null;
  var storageWorks = true;
  try {
    choice = localStorage.getItem(KEY);
    localStorage.setItem(KEY + '-check', '1');
    localStorage.removeItem(KEY + '-check');
  } catch (_) { storageWorks = false; }
  var privacySignal = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  var enabled = RELEASED && storageWorks && !privacySignal && choice !== 'off' && (choice === 'on' || DEFAULT_ON);
  var loaded = false;
  window['ga-disable-' + ID] = !enabled;

  function clearAnalyticsCookies() {
    document.cookie.split(';').forEach(function (item) {
      var name = item.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|hubspotutk$|__hstc$|__hssc$|__hssrc$)/.test(name)) return;
      var suffix = '=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = name + suffix;
      var parts = location.hostname.split('.');
      while (parts.length > 1) {
        document.cookie = name + suffix + '; Domain=' + parts.join('.');
        parts.shift();
      }
    });
  }

  function pageData() {
    var referrer = '';
    try {
      var ref = new URL(document.referrer);
      if (ref.protocol === 'https:' || ref.protocol === 'http:') {
        // Keep reviewed internal paths and external origins only.
        // Strip external paths, credentials, queries and fragments.
        var refPath = ref.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/');
        if (ref.origin === 'https://ahofarms.com') referrer = ref.origin + (pages.indexOf(refPath) !== -1 ? refPath : '/');
        else referrer = ref.origin + '/';
      }
    } catch (_) {}
    var data = {
      aho_analytics_allowed: true,
      aho_page_location: 'https://ahofarms.com' + path,
      aho_page_referrer: referrer,
      aho_page_title: 'Aho Farms ' + path,
      // Empty defaults also prevent stale campaign values on future events.
      aho_campaign_source: '', aho_campaign_medium: '', aho_campaign_name: '',
      aho_campaign_id: '', aho_campaign_content: '', aho_campaign_term: ''
    };
    // Keep ordinary campaign labels rather than a fixed source/medium list.
    // Reject obvious email/phone values, control characters and oversized data.
    // Campaign URLs must still contain campaign labels, not personal/health data.
    var params = new URLSearchParams(location.search);
    var campaignKeys = { source: 'source', medium: 'medium', name: 'campaign',
      id: 'id', content: 'content', term: 'term' };
    Object.keys(campaignKeys).forEach(function (key) {
      var value = (params.get('utm_' + campaignKeys[key]) || '').trim();
      if (value.length <= 100 && !/[@\x00-\x1f\x7f]/.test(value) &&
          !/\d[\d\s().+-]{6,}\d/.test(value)) data['aho_campaign_' + key] = value;
    });
    return data;
  }

  function start() {
    if (!enabled || loaded || location.origin !== 'https://ahofarms.com') return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    // gtag is used only to queue Consent Mode before GTM, never to load GA4.
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    // The reviewed container includes the existing HubSpot Custom HTML tag.
    // CSP limits its external scripts; the same preference gate controls GTM.
    window._hsq = window._hsq || [];
    window._hsp = window._hsp || [];
    if (choice === 'on') window._hsq.push(['doNotTrack', { track: true }]);
    window._hsq.push(['setPath', path]);
    // These fields exist before the Google configuration tag initialises.
    window.dataLayer.push(pageData());
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WJN7H2PZ';
    document.head.appendChild(script);
  }

  function stop() {
    enabled = false;
    window['ga-disable-' + ID] = true;
    try {
      if (loaded) window.dataLayer.push({ aho_analytics_allowed: false });
      if (loaded && window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    } catch (_) {}
    try { if (loaded && window._hsp) window._hsp.push(['revokeCookieConsent']); } catch (_) {}
    try { if (loaded && window._hsq) window._hsq.push(['doNotTrack']); } catch (_) {}
    clearAnalyticsCookies();
  }

  function save(value) {
    try { localStorage.setItem(KEY, value); }
    catch (_) { stop(); if (status) status.textContent = 'Analytics remain off. Your browser could not save this preference.'; return; }
    choice = value;
    if (value === 'off') stop();
    // Reload removes an already loaded third-party script after withdrawal.
    location.reload();
  }

  var settings = document.getElementById('analytics-settings');
  var status;
  if (settings) {
    status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = !RELEASED ? 'Optional analytics are currently off on this website.' :
      enabled ? 'Optional Google Analytics and HubSpot visitor tracking are enabled. HubSpot may also apply its account cookie choices.' : 'Optional analytics are off.';
    if (choice === 'off') status.textContent += ' Your opt-out is saved in this browser.';
    if (privacySignal) status.textContent += ' Your browser privacy signal is respected.';
    settings.appendChild(status);
    var off = document.createElement('button');
    off.type = 'button'; off.textContent = 'Turn off optional analytics';
    off.addEventListener('click', function () { save('off'); });
    settings.appendChild(off);
    if (RELEASED && storageWorks && !privacySignal) {
      var on = document.createElement('button');
      on.type = 'button'; on.textContent = 'Allow optional analytics';
      on.addEventListener('click', function () { save('on'); });
      settings.appendChild(on);
    }
  }
  // Withdrawal in another tab stops this tab too.
  window.addEventListener('storage', function (event) {
    if (event.key === KEY && event.newValue !== 'on') { stop(); location.reload(); }
  });
  window.ahoTrackFormSuccess = function (id) {
    if (!enabled || !loaded) return;
    var forms = { contact_form: ['/contact', 'Contact enquiry'],
      partner_form: ['/export-partners', 'Partnership enquiry'] };
    var form = forms[id];
    if (!form || form[0] !== path) return;
    window.dataLayer.push(pageData());
    window.dataLayer.push({ event: 'aho_form_success', form_id: id, form_name: form[1] });
  };
  if (!enabled) clearAnalyticsCookies();
  start();
})();

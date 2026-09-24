/* Sends an audience-page form (prescribers, pharmacies, export partners) to
   /api/enquiry/send, which emails it to the Aho Farms team. Each field goes
   as [label text, value]; selects send the chosen option's text.
   window.ahoEnquiry(form, kind) resolves on success and rejects with an
   Error whose message can be shown to the visitor. */
(function () {
  'use strict';
  function labelFor(form, el) {
    var l = el.id && form.querySelector('label[for="' + el.id + '"]');
    if (!l) l = el.closest('label');
    var t = l ? l.textContent : (el.name || el.id || '');
    return t.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }
  window.ahoEnquiry = function (form, kind) {
    var fields = [], email = '';
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name && !el.id) return;
      if (/^(submit|button|reset|hidden|file)$/.test(el.type) || el.tagName === 'BUTTON') return;
      var value;
      if (el.type === 'checkbox' || el.type === 'radio') { if (!el.checked) return; value = 'Yes'; }
      else if (el.tagName === 'SELECT') value = el.value ? el.options[el.selectedIndex].text : '';
      else value = el.value.trim();
      if (el.type === 'email' && !email) email = value;
      fields.push([labelFor(form, el), value]);
    });
    return fetch('/api/enquiry/send', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form: kind, email: email, fields: fields })
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.error || 'Something went wrong. Please try again, or email admin@ahofarms.com.');
        return r;
      }, function () { throw new Error('We could not send your form. Please try again, or email admin@ahofarms.com.'); });
  };
})();

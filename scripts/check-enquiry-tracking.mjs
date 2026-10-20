// End-to-end application contract with fake DOM and mocked external transport.
// Executes the actual form JavaScript, API handlers and Resend adapter. No network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { visit } = require('./check-analytics.js');
for (const key of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) delete process.env[key];
process.env.CONTACT_TO = 'qa-contact@example.test';
process.env.ENQUIRY_TO = 'qa-export@example.test';
process.env.MAIL_FROM = 'Aho test <qa@example.test>';
const contact = (await import('../lib/api/contact/send.js')).default;
const enquiry = (await import('../lib/api/enquiry/send.js')).default;
let mode, transport = [], serial = 0;
const logs = [];
const oldError = console.error, oldWarn = console.warn;
console.error = (...args) => logs.push(args.join(' '));
console.warn = (...args) => logs.push(args.join(' '));
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://api.resend.com/emails', 'All external I/O is intercepted');
  transport.push(JSON.parse(options.body));
  if (mode === 'network') throw Error('synthetic private transport detail');
  if (mode === 'reject') return { ok: false, status: 403 };
  if (mode === 'malformed') return { ok: true, json: async () => ({}) };
  return { ok: true, json: async () => ({ id: 'mock-accepted-id' }) };
};
function node() { return { textContent: '', hidden: true, isConnected: true,
  setAttribute() {}, removeAttribute() {}, appendChild() {}, remove() {}, closest() { return null; } }; }
function frontend(kind, optedOut = false, trackingThrows = false) {
  const isContact = kind === 'contact', pathname = isContact ? '/contact' : '/export-partners';
  const analytics = visit({ released: true, choice: optedOut ? 'off' : undefined,
    location: { pathname, search: '?email=private@example.test#private' } });
  const btn = { ...node(), disabled: false, textContent: 'Send' }, status = node();
  const values = isContact ? { firstName: 'Synthetic', lastName: 'Test', email: 'private@example.test',
    organisation: 'Test only', contactAs: 'general', subject: 'Tracking test', messageBody: 'private-health-sentinel', professionalConfirm: 'on' } :
    { company: 'Synthetic business', email: 'private@example.test', message: 'private-health-sentinel' };
  const form = { elements: Object.entries(values).map(([name, value]) => ({ name, id: name, value,
    type: name === 'email' ? 'email' : 'text', tagName: 'INPUT', closest: () => null })),
    professionalConfirm: { checked: true }, innerHTML: '<fields>', resets: 0,
    appendChild(el) { this.message = el; },
    querySelector(selector) { if (selector === 'button[type="submit"]') return btn; return null; },
    querySelectorAll() { return []; },
    addEventListener(name, handler) { this[name] = handler; },
    checkValidity: () => true, reportValidity() {}, reset() { this.resets++; },
  };
  const document = { getElementById: id => /Status$/.test(id) ? status : form,
    createElement: node, addEventListener: (_, callback) => callback() };
  const requests = [];
  async function fetchApi(url, options) {
    assert.equal(url, isContact ? '/api/contact/send' : '/api/enquiry/send');
    const req = { method: 'POST', body: JSON.parse(options.body),
      headers: { host: 'ahofarms.com', origin: 'https://ahofarms.com', 'x-forwarded-for': 'test-' + (++serial) } };
    let payload;
    const res = { statusCode: 200, setHeader() {}, end(body) { payload = JSON.parse(body); } };
    const pending = (isContact ? contact : enquiry)(req, res).then(() => ({ ok: res.statusCode >= 200 && res.statusCode < 300, json: async () => payload }));
    requests.push(pending); return pending;
  }
  const context = { window: analytics.window, document, fetch: fetchApi, console,
    FormData: class { forEach(cb) { for (const [key, value] of Object.entries(values)) cb(value, key); } } };
  if (trackingThrows) context.window.ahoTrackFormSuccess = () => { throw Error('tracker unavailable'); };
  if (!isContact) vm.runInNewContext(fs.readFileSync(new URL('../assets/aho-enquiry.js', import.meta.url), 'utf8'), context);
  const html = fs.readFileSync(new URL(isContact ? '../contact.html' : '../export-partners.html', import.meta.url), 'utf8');
  const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes("getElementById('" + (isContact ? 'contactForm' : 'partnerForm') + "')"));
  assert(source); vm.runInNewContext(source, context);
  return { form, btn, status, analytics, values, requests,
    submit: () => form.submit({ preventDefault() {} }),
    async flush() { await Promise.all(requests); await new Promise(resolve => setImmediate(resolve)); },
    message: () => isContact ? form.message : status };
}
try {
  for (const kind of ['contact', 'export']) {
    for (const scenario of ['missing', 'reject', 'network', 'malformed', 'success']) {
      mode = scenario; transport = [];
      if (scenario === 'missing') delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = 'test-only-not-a-secret';
      const f = frontend(kind); f.submit(); f.submit(); await f.flush();
      assert.equal(f.requests.length, 1, 'Repeated click while sending is ignored');
      const success = scenario === 'success';
      const events = f.analytics.queue().filter(e => e.event === 'aho_form_success');
      assert.equal(events.length, success ? 1 : 0, kind + '/' + scenario);
      assert.equal(f.btn.disabled, false);
      if (success) {
        assert.deepEqual(JSON.parse(JSON.stringify(events[0])), { event: 'aho_form_success',
          form_id: kind === 'contact' ? 'contact_form' : 'partner_form',
          form_name: kind === 'contact' ? 'Contact enquiry' : 'Partnership enquiry' });
        assert.equal(transport[0].to[0], kind === 'contact' ? 'qa-contact@example.test' : 'qa-export@example.test');
        assert(transport[0].text.includes('private-health-sentinel'), 'Actual enquiry fields preserved for mail, not GA');
        assert.equal(kind === 'contact' ? f.form.innerHTML === '' : f.form.resets === 1, true);
      } else {
        assert.equal(f.form.innerHTML, '<fields>', 'Failed enquiry keeps fields');
        assert.equal(f.form.resets, 0);
        assert.match(f.message().textContent, /try again|email/i);
      }
      assert(!JSON.stringify(f.analytics.queue()).includes('private'), 'No personal/message values in GA queue');
    }
    mode = 'success'; process.env.RESEND_API_KEY = 'test-only-not-a-secret';
    const off = frontend(kind, true); off.submit(); await off.flush();
    assert.equal(off.analytics.queue().length, 0, 'Opt-out does not block enquiry but prevents analytics');
    const brokenTracker = frontend(kind, false, true); brokenTracker.submit(); await brokenTracker.flush();
    assert.match(brokenTracker.message().textContent, /Thank you/, 'Tracking failure cannot turn accepted enquiry into failure UI');
  }
  // Validation and honeypot paths cannot claim accepted mail.
  for (const [handler, body] of [[contact, {}], [contact, { website: 'bot' }], [enquiry, { form: 'export-partner', email: 'invalid' }]]) {
    let result;
    const res = { statusCode: 200, setHeader() {}, end(s) { result = JSON.parse(s); } };
    const before = transport.length;
    await handler({ method: 'POST', body, headers: { host: 'ahofarms.com', 'x-forwarded-for': 'test-' + (++serial) } }, res);
    assert.notEqual(result.sent, true); assert.equal(transport.length, before);
  }
  const page = visit({ released: true, location: { pathname: '/contact' } });
  page.events.storage({ key: 'aho-analytics-choice-v1', newValue: 'off' });
  page.window.ahoTrackFormSuccess('contact_form');
  assert(!page.queue().some(e => e.event === 'aho_form_success'), 'Withdrawal prevents subsequent conversion');
  for (const pathname of ['/portal/consumers', '/prescribers', '/patients']) {
    assert.equal(visit({ released: true, location: { pathname } }).window.ahoTrackFormSuccess, undefined);
  }
  assert(!logs.join(' ').includes('private'), 'Transport diagnostics contain no private field/provider response data');
} finally {
  globalThis.fetch = originalFetch; console.error = oldError; console.warn = oldWarn;
}
console.log('ENQUIRY TRACKING PASS: actual frontend→API→mocked Resend success/failures; one safe conversion, preserved failed fields, opt-out/private exclusions and tracker-error isolation. No email/CRM/network performed.');

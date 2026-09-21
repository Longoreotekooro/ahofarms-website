// GET /r/<code>  (rewritten to /api/index?route=referral/go&code=<code>)
// The tracked hand-off. Looks up the lead, records that the hand-off
// happened, and redirects to the partner's pathway with ?ref=<code> so the
// partner can attribute it too. Unknown codes land on the Consumer Portal
// with a notice. The partner URL is only ever seen here.
import { leadByCode, updateLead, listPartners } from '../../users.js';
import { REFERRAL_CODE_RE } from '../../partners.js';

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const code = String(url.searchParams.get('code') || '').toLowerCase();
  const back = '/portal/consumers/index.html?notice=referral-unknown#get-connected';
  res.setHeader('Cache-Control', 'no-store');
  if (!REFERRAL_CODE_RE.test(code)) { res.statusCode = 302; res.setHeader('Location', back); return res.end(); }
  const lead = await leadByCode(code);
  const partner = lead && lead.partnerId ? (await listPartners()).find(p => p.id === lead.partnerId) : null;
  if (!lead || !partner || !partner.referralUrl) { res.statusCode = 302; res.setHeader('Location', back); return res.end(); }
  const now = new Date().toISOString();
  await updateLead(lead.id, { handoffAt: lead.handoffAt || now, lastHandoffAt: now, handoffCount: (lead.handoffCount || 0) + 1, status: lead.status === 'referred' ? 'handed-off' : lead.status });
  const target = new URL(partner.referralUrl);
  target.searchParams.set('ref', code);
  if (!target.searchParams.has('utm_source')) { target.searchParams.set('utm_source', 'ahofarms'); target.searchParams.set('utm_medium', 'referral'); }
  res.statusCode = 302;
  res.setHeader('Location', target.toString());
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end();
}

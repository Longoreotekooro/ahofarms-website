// POST /api/newsletter/subscribe — the industry newsletter form (news.html).
// Stores the subscriber (Redis hash `newsletter` when the store is
// configured) and notifies NEWSLETTER_TO (default admin@ahofarms.com) so
// the list can be maintained in the mailing tool of choice.
import { saveSubscriber } from '../../users.js';
import { sendMail } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, clip } from '../../http.js';

const ROLES = { healthcare: 'Healthcare Professional', pharmacist: 'Pharmacist', industry: 'Industry Professional', other: 'Other' };
const NEWSLETTER_TO = () => String(process.env.NEWSLETTER_TO || process.env.CONTACT_TO || 'admin@ahofarms.com').split(',').map(s => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const b = await readBody(req);
  if (String(b.website || '')) return json(res, 200, { ok: true }); // honeypot
  if (await limited(`newsletter:${clientIp(req)}`, 6, 3600)) return fail(res, 429, 'Too many requests from this connection. Please try again later.');
  const email = clip(b.email, 200).toLowerCase();
  const role = clip(b.role, 20);
  const errors = {};
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (!ROLES[role]) errors.role = 'Tell us who you are.';
  if (Object.keys(errors).length) return fail(res, 400, 'Please check the highlighted fields.', { fields: errors });

  await saveSubscriber(email, role, { ip: clientIp(req), ua: clip(req.headers['user-agent'], 200) });
  const r = await sendMail({
    to: NEWSLETTER_TO(),
    subject: `Newsletter subscription: ${email}`,
    text: `A new subscriber has joined the Aho Farms industry newsletter list.\n\nEmail: ${email}\nRole: ${ROLES[role]}\nSubscribed: ${new Date().toISOString()}\n\nAdd them to the mailing list.`,
  });
  if (!r.sent) console.warn(`[newsletter] notification not sent (no mail transport): ${email}`);
  return json(res, 200, { ok: true, message: 'Thank you — you have been subscribed to the Aho Farms industry newsletter.' });
}

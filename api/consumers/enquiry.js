// POST /api/consumers/enquiry { name, email, region, consultation, message }
// "Need help finding a prescriber?" Stored for the team and emailed. No
// medical detail is asked for; the message field is free text the
// consumer chooses to share.
import { saveAccessRequest } from '../../lib/users.js';
import { CONSULTATION_TYPES } from '../../lib/providers.js';
import { sendMail, adminRecipients } from '../../lib/mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, clip } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const b = await readBody(req);
  if (String(b.website || '')) return json(res, 200, { ok: true }); // honeypot
  if (await limited(`enquiry:${clientIp(req)}`, 6, 3600)) return fail(res, 429, 'Too many enquiries from this connection. Please try again later.');
  const fields = { name: clip(b.name, 120), email: clip(b.email, 200), region: clip(b.region, 120), consultation: clip(b.consultation, 40), message: clip(b.message, 1500) };
  const errors = {};
  if (!fields.name) errors.name = 'Your name is required.';
  if (!isEmail(fields.email)) errors.email = 'Enter a valid email address.';
  if (!fields.region) errors.region = 'Tell us your region.';
  if (fields.consultation && !CONSULTATION_TYPES.includes(fields.consultation)) errors.consultation = 'Choose one of the listed options.';
  if (Object.keys(errors).length) return fail(res, 400, 'Please check the highlighted fields.', { fields: errors });
  const saved = await saveAccessRequest('consumers', fields, { kind: 'consumer-enquiry', ip: clientIp(req) });
  await sendMail({
    to: adminRecipients(),
    subject: `Consumer enquiry: help finding a prescriber (${fields.region})`,
    text: `A consumer has asked for help finding a prescriber.\n\nID: ${saved.id}\nName: ${fields.name}\nEmail: ${fields.email}\nRegion: ${fields.region}\nPreferred consultation: ${fields.consultation || '-'}\n\n${fields.message || '(no message)'}`,
  });
  return json(res, 200, { ok: true, message: 'Thank you. The Aho Farms team will reply by email with prescriber options for your region. This is general guidance only; any assessment is made by the independent prescriber you choose.' });
}

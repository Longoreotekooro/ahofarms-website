// POST /api/contact/send — the website contact form (contact.html).
// Validates, rate-limits, drops honeypot submissions, and emails the message
// to CONTACT_TO (default admin@ahofarms.com). Nothing is stored.
import { sendMail } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, clip } from '../../http.js';

const ROLES = { healthcare: 'Healthcare Professional', pharmacist: 'Pharmacist', export: 'Export / Distribution Partner', media: 'Media / Journalist', general: 'General Enquiry' };
const CONTACT_TO = () => String(process.env.CONTACT_TO || 'admin@ahofarms.com').split(',').map(s => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const b = await readBody(req);
  if (String(b.website || '')) return json(res, 200, { ok: true }); // honeypot
  if (await limited(`contact:${clientIp(req)}`, 6, 3600)) return fail(res, 429, 'Too many messages from this connection. Please try again later.');

  const f = {
    firstName: clip(b.firstName, 80), lastName: clip(b.lastName, 80), email: clip(b.email, 200).toLowerCase(),
    organisation: clip(b.organisation, 200), contactAs: clip(b.contactAs, 20), subject: clip(b.subject, 200), message: clip(b.messageBody, 4000),
  };
  const errors = {};
  if (!f.firstName) errors.firstName = 'Your first name is required.';
  if (!f.lastName) errors.lastName = 'Your last name is required.';
  if (!isEmail(f.email)) errors.email = 'Enter a valid email address.';
  if (!ROLES[f.contactAs]) errors.contactAs = 'Choose how you are contacting us.';
  if (!f.message) errors.messageBody = 'Please write your message.';
  const yes = v => v === true || v === 'on' || v === 'true' || v === '1';
  if (!yes(b.professionalConfirm)) errors.professionalConfirm = 'Please confirm this enquiry is on behalf of a business or professional body.';
  if (Object.keys(errors).length) return fail(res, 400, 'Please check the highlighted fields.', { fields: errors });

  const r = await sendMail({
    to: CONTACT_TO(),
    subject: `Website enquiry (${ROLES[f.contactAs]}): ${f.subject || f.firstName + ' ' + f.lastName}`,
    text: [
      'A new message has been sent through the Aho Farms website contact form.', '',
      `Name: ${f.firstName} ${f.lastName}`, `Email: ${f.email}`, `Organisation: ${f.organisation || '-'}`, `Contacting as: ${ROLES[f.contactAs]}`,
      `Subject: ${f.subject || '-'}`, `Received: ${new Date().toISOString()}`, '', 'Message:', f.message, '',
      `Reply to this sender at ${f.email}.`,
    ].join('\n'),
  });
  if (!r.sent) console.warn(`[contact] message not sent (no mail transport): ${f.email} ${JSON.stringify(f.subject)}`);
  console.log(`[contact] ${f.contactAs} ${f.email}`);
  return json(res, 200, { ok: true, message: 'Thank you for your message. A member of the Aho Farms team will be in touch within 2 business days.' });
}

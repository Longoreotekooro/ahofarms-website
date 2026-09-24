// POST /api/enquiry/send — the audience-page forms (prescribers.html,
// pharmacies.html, export-partners.html). The page sends its fields as
// [label, value] pairs; this validates the sender's email, rate-limits,
// drops honeypot submissions and emails everything to ENQUIRY_TO
// (default admin@ahofarms.com). Nothing is stored.
import { sendMail } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, clip } from '../../http.js';

const FORMS = {
  prescriber: 'Prescriber access request',
  pharmacy: 'Pharmacy access request',
  'export-partner': 'Export partner enquiry',
};
const ENQUIRY_TO = () => String(process.env.ENQUIRY_TO || process.env.CONTACT_TO || 'admin@ahofarms.com').split(',').map(s => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const b = await readBody(req);
  if (String(b.website || '')) return json(res, 200, { ok: true }); // honeypot
  const kind = FORMS[String(b.form || '')];
  if (!kind) return fail(res, 400, 'Unknown form.');
  if (await limited(`enquiry:${clientIp(req)}`, 6, 3600)) return fail(res, 429, 'Too many submissions from this connection. Please try again later.');

  const email = clip(b.email, 200).toLowerCase();
  if (!isEmail(email)) return fail(res, 400, 'Enter a valid email address.');
  const fields = (Array.isArray(b.fields) ? b.fields : []).slice(0, 30)
    .filter(p => Array.isArray(p))
    .map(([label, value]) => [clip(label, 80), clip(value, 2000)])
    .filter(([label]) => label);

  const r = await sendMail({
    to: ENQUIRY_TO(),
    subject: `Website ${kind.toLowerCase()}: ${email}`,
    text: [
      `A new ${kind.toLowerCase()} has been sent through the Aho Farms website.`, '',
      ...fields.map(([l, v]) => `${l}: ${v || '-'}`), '',
      `Received: ${new Date().toISOString()}`, `Reply to this sender at ${email}.`,
    ].join('\n'),
  });
  if (!r.sent) console.warn(`[enquiry] ${b.form} not sent (no mail transport): ${email}`);
  console.log(`[enquiry] ${b.form} ${email}`);
  return json(res, 200, { ok: true });
}

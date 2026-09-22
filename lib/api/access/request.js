// POST /api/access/request { portal, ...fields }
// Validates the portal-specific form, stores the request for administrator
// review and notifies the team. Never creates an account or grants access.
import { getPortal } from '../../portals.js';
import { isAvailable } from '../../flags.js';
import { saveAccessRequest } from '../../users.js';
import { sendMail, adminRecipients } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, clip } from '../../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const body = await readBody(req);
  const portal = getPortal(String(body.portal || ''));
  if (!portal) return fail(res, 400, 'Unknown portal.');
  if (!isAvailable(portal.id)) return fail(res, 404, 'This portal is not available.');
  if (String(body.website || '')) return json(res, 200, { ok: true }); // honeypot
  if (await limited(`access:${clientIp(req)}`, 8, 3600)) return fail(res, 429, 'Too many requests from this connection. Please try again later.');

  const fields = {}, errors = {};
  for (const f of portal.requestFields) {
    const v = clip(body[f.name], f.type === 'textarea' ? 2000 : 300);
    if (f.required && !v) errors[f.name] = `${f.label} is required.`;
    else if (f.type === 'email' && v && !isEmail(v)) errors[f.name] = 'Enter a valid email address.';
    else if (f.type === 'select' && v && !f.options.includes(v)) errors[f.name] = `Choose one of the listed options.`;
    fields[f.name] = v;
  }
  if (Object.keys(errors).length) return fail(res, 400, 'Please check the highlighted fields.', { fields: errors });

  const saved = await saveAccessRequest(portal.id, fields, { ip: clientIp(req), ua: clip(req.headers['user-agent'], 200) });
  const lines = portal.requestFields.map(f => `${f.label}: ${fields[f.name] || '-'}`).join('\n');
  await sendMail({
    to: adminRecipients(),
    subject: `${portal.name} access request: ${fields.name || fields.email}`,
    text: `A new ${portal.name} access request needs review.\n\nRequest ID: ${saved.id}\nSubmitted: ${saved.submittedAt}\n\n${lines}\n\nReview and approve with: node scripts/portal-admin.js requests`,
  });
  console.log(`[access-request] ${portal.id} ${saved.id} ${fields.email}`);
  return json(res, 200, { ok: true, id: saved.id, message: `Thank you. Your request for ${portal.name} access has been received and will be reviewed by Aho Farms. We will be in touch by email.` });
}

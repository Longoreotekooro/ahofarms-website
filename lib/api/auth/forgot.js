// POST /api/auth/forgot { portal, email }
// Always answers the same way so it cannot be used to test whether an
// email has an account. If the account exists and is active, a one-hour
// reset token is stored and, when a mail transport is configured, emailed.
import { getPortal } from '../../portals.js';
import { findUser, tokens } from '../../users.js';
import { sendMail } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, isEmail, newToken } from '../../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const body = await readBody(req);
  const portal = getPortal(String(body.portal || ''));
  const email = String(body.email || '').trim().toLowerCase();
  if (!portal || !isEmail(email)) return fail(res, 400, 'Enter the email address on your account.');
  if (await limited(`forgot:${clientIp(req)}`, 10, 900)) return fail(res, 429, 'Too many requests. Please try again later.');

  const reply = { ok: true, message: 'If that email has an approved account, we have sent instructions for resetting the password. If nothing arrives, contact Aho Farms.' };
  const user = await findUser(email);
  if (!user || user.status !== 'active' || user.bootstrap) return json(res, 200, reply);

  const token = newToken();
  await tokens.put('reset', token, { email: user.email, portal: portal.id }, 3600);
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  const link = `${origin}/portal/${portal.id}/reset.html?token=${token}`;
  const r = await sendMail({
    to: user.email,
    subject: `Reset your Aho Farms ${portal.name} password`,
    text: `Kia ora ${user.name},\n\nUse this link within the next hour to choose a new password for the Aho Farms ${portal.name}:\n\n${link}\n\nIf you did not ask for this, you can ignore this email.\n\nAho Farms`,
  });
  if (!r.sent) console.log(`[forgot] reset link for ${user.email} (${portal.id}): ${link}`);
  return json(res, 200, reply);
}

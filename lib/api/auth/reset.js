// POST /api/auth/reset { token, password }
// Consumes a one-time token (from forgot-password or an admin approval)
// and sets the account's password. Needs a writable store.
import { findUser, updateUser, tokens, store } from '../../users.js';
import { hashPassword, passwordProblem } from '../../password.js';
import { json, fail, readBody, requireMethod, sameOrigin } from '../../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const body = await readBody(req);
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return fail(res, 400, 'This reset link is not valid.');
  const problem = passwordProblem(password);
  if (problem) return fail(res, 400, problem);
  if (!store().writable) return fail(res, 503, 'Password changes are managed by Aho Farms on this deployment. Please contact us.');

  const data = await tokens.take('reset', token);
  if (!data) return fail(res, 400, 'This reset link has expired or already been used. Request a new one.');
  const user = await findUser(data.email);
  if (!user || user.bootstrap) return fail(res, 400, 'This reset link is no longer valid.');
  const patch = { passwordHash: await hashPassword(password) };
  if (user.status === 'pending') patch.status = 'active';
  await updateUser(user.email, patch);
  return json(res, 200, { ok: true, message: 'Your password has been set. You can sign in now.', redirect: `/portal/${data.portal}/login.html` });
}

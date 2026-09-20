// POST /api/auth/change-password { current, password } — signed-in users only.
import { findUser, updateUser, store } from '../../lib/users.js';
import { hashPassword, verifyPassword, passwordProblem } from '../../lib/password.js';
import { json, fail, readBody, requireMethod, sameOrigin, sessionFrom } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const s = await sessionFrom(req);
  if (!s) return fail(res, 401, 'Please sign in again.');
  const body = await readBody(req);
  const problem = passwordProblem(String(body.password || ''));
  if (problem) return fail(res, 400, problem);
  const user = await findUser(s.email);
  if (!user) return fail(res, 401, 'Please sign in again.');
  if (user.bootstrap || !store().writable) return fail(res, 503, 'This account\'s password is managed by Aho Farms. Please contact us to change it.');
  if (!(await verifyPassword(String(body.current || ''), user.passwordHash))) return fail(res, 400, 'Your current password was not recognised.');
  await updateUser(user.email, { passwordHash: await hashPassword(String(body.password)) });
  return json(res, 200, { ok: true, message: 'Your password has been updated.' });
}

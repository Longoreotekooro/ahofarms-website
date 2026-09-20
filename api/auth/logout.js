// POST /api/auth/logout — clears the session cookies.
import { clearCookies } from '../../lib/session.js';
import { json, fail, requireMethod, sameOrigin, isSecure } from '../../lib/http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  res.setHeader('Set-Cookie', clearCookies({ secure: isSecure(req) }));
  return json(res, 200, { ok: true, redirect: '/portal/' });
}

// POST /api/auth/login  { portal, email, password, remember }
// Verifies the account, checks its status and that its role admits the
// requested portal, then sets the signed session cookie.
import { getPortal, roleAllows, portalForRole, portalHome, portalPath } from '../../portals.js';
import { isAvailable } from '../../flags.js';
import { findUser } from '../../users.js';
import { verifyPassword, dummyVerify } from '../../password.js';
import { signSession, sessionCookies, getSecret } from '../../session.js';
import { json, fail, readBody, requireMethod, sameOrigin, isSecure, clientIp, limited, isEmail } from '../../http.js';

const GENERIC = 'That email and password combination was not recognised.';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  if (!getSecret()) return fail(res, 503, 'Portal sign-in is not configured yet. Please contact Aho Farms.');

  const body = await readBody(req);
  const portal = getPortal(String(body.portal || ''));
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const remember = body.remember === true || body.remember === 'on' || body.remember === '1';
  if (!portal) return fail(res, 400, 'Unknown portal.');
  if (!isAvailable(portal.id)) return fail(res, 404, 'This portal is not available.');
  if (!isEmail(email) || !password) return fail(res, 400, 'Enter your email and password.');

  const ip = clientIp(req);
  if (await limited(`login:${ip}`, 30, 900) || await limited(`login:${email}`, 10, 900)) {
    return fail(res, 429, 'Too many sign-in attempts. Please wait 15 minutes and try again.');
  }

  const user = await findUser(email);
  if (!user || !user.passwordHash) { await dummyVerify(password); return fail(res, 401, GENERIC); }
  if (!(await verifyPassword(password, user.passwordHash))) return fail(res, 401, GENERIC);

  if (user.status === 'suspended') return fail(res, 403, 'This account has been suspended. Please contact Aho Farms.');
  if (user.status !== 'active') return fail(res, 403, 'This account is awaiting approval by Aho Farms.');

  if (!roleAllows(user.role, portal)) {
    const own = portalForRole(user.role);
    return fail(res, 403, own
      ? `This account does not have access to the ${portal.name}. Your access is to the ${own.name}.`
      : `This account does not have access to the ${portal.name}.`,
      own ? { redirect: `/portal/${own.id}/login.html` } : {});
  }

  const { token, maxAge } = await signSession(
    { sub: user.id, email: user.email, name: user.name, role: user.role, org: user.org || '' }, { remember });
  res.setHeader('Set-Cookie', sessionCookies(token, maxAge, user.role, { secure: isSecure(req) }));

  // Only ever redirect inside this portal's own path.
  let redirect = portalHome(portal);
  const next = String(body.next || '');
  if (next.startsWith(portalPath(portal)) && !next.includes('//') && !/(login|forgot|reset|request-access)\.html/.test(next)) redirect = next;
  return json(res, 200, { ok: true, redirect, user: { name: user.name, role: user.role } });
}

// Administrator account management (role 'admin' only).
//   GET    /api/admin/users              list accounts
//   POST   /api/admin/users              { email, name, role, org, password? }  create (returns a set-password link if no password)
//   PATCH  /api/admin/users              { email, status?, role?, name?, org? } approve / suspend / re-role
//   DELETE /api/admin/users?email=...    remove
import { listUsers, createUser, updateUser, removeUser, findUser, publicUser, tokens, store } from '../../users.js';
import { hashPassword, passwordProblem } from '../../password.js';
import { portalForRole } from '../../portals.js';
import { json, fail, readBody, sameOrigin, sessionFrom, newToken } from '../../http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s || s.role !== 'admin') return fail(res, 403, 'Administrator access required.');
  if (req.method !== 'GET' && !sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  if (req.method !== 'GET' && !store().writable) return fail(res, 503, 'The account store is read-only on this deployment (set up the Redis store to manage accounts).');
  try {
    if (req.method === 'GET') return json(res, 200, { ok: true, users: await listUsers(), store: store().writable ? 'redis' : 'env (read-only)' });
    if (req.method === 'POST') {
      const b = await readBody(req);
      let passwordHash = null;
      if (b.password) { const p = passwordProblem(String(b.password)); if (p) return fail(res, 400, p); passwordHash = await hashPassword(String(b.password)); }
      const user = await createUser({ email: b.email, name: b.name, role: b.role, org: b.org, passwordHash, status: passwordHash ? 'active' : 'pending' });
      const out = { ok: true, user: publicUser(user) };
      if (!passwordHash) {
        const token = newToken();
        const portal = portalForRole(user.role) || { id: 'prescriber' };
        await tokens.put('reset', token, { email: user.email, portal: portal.id }, 7 * 86400);
        out.setPasswordPath = `/portal/${portal.id}/reset.html?token=${token}`;
      }
      return json(res, 201, out);
    }
    if (req.method === 'PATCH') {
      const b = await readBody(req);
      if (!b.email) return fail(res, 400, 'email is required.');
      const existing = await findUser(b.email);
      if (existing && existing.bootstrap) return fail(res, 400, 'The bootstrap administrator is managed through environment variables.');
      const user = await updateUser(b.email, { status: b.status, role: b.role, name: b.name, org: b.org });
      return json(res, 200, { ok: true, user: publicUser(user) });
    }
    if (req.method === 'DELETE') {
      const email = new URL(req.url, 'http://x').searchParams.get('email');
      if (!email) return fail(res, 400, 'email is required.');
      await removeUser(email);
      return json(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return fail(res, 405, 'Method not allowed');
  } catch (e) { return fail(res, 400, e.message); }
}

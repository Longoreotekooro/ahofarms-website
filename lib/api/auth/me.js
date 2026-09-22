// GET /api/auth/me — who is signed in (from the signed cookie), and which
// portals that role may enter. Never returns anything sensitive.
import { PORTALS, roleAllows } from '../../portals.js';
import { sessionFrom, json } from '../../http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s) return json(res, 200, { ok: true, authenticated: false });
  const portals = PORTALS.filter(p => roleAllows(s.role, p)).map(p => ({ id: p.id, name: p.name, href: `/portal/${p.id}/home` }));
  return json(res, 200, { ok: true, authenticated: true, user: { name: s.name, email: s.email, role: s.role, org: s.org || '' }, portals, expires: s.exp });
}

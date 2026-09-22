// GET /api/portal/home?portal=<id>
// The dashboard framework for the signed-in user's portal. Verifies the
// session and that the role admits the portal before anything is returned.
import { getPortal, roleAllows } from '../../portals.js';
import { isAvailable } from '../../flags.js';
import { contentFor } from '../../portal-content.js';
import { json, fail, sessionFrom } from '../../http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s) return fail(res, 401, 'Sign in to view this portal.');
  const url = new URL(req.url, 'http://x');
  const portal = getPortal(url.searchParams.get('portal') || '');
  if (!portal) return fail(res, 400, 'Unknown portal.');
  if (!isAvailable(portal.id)) return fail(res, 404, 'This portal is not available.');
  if (!roleAllows(s.role, portal)) return fail(res, 403, 'Your account does not have access to this portal.');
  const content = contentFor(portal.id);
  return json(res, 200, {
    ok: true,
    portal: { id: portal.id, name: portal.name, support: portal.support },
    user: { name: s.name, email: s.email, role: s.role, org: s.org || '' },
    ...content,
  });
}

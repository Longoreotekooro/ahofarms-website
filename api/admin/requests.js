// Administrator review of access requests (role 'admin' only).
//   GET  /api/admin/requests                      list
//   POST /api/admin/requests { id, action }       action: 'approve' | 'decline'
// Approving creates a pending account for the requester and returns a
// seven-day set-password link to send them (emailed automatically when a
// mail transport is configured).
import { listAccessRequests, getAccessRequest, updateAccessRequest, createUser, findUser, tokens, store } from '../../lib/users.js';
import { getPortal } from '../../lib/portals.js';
import { sendMail } from '../../lib/mail.js';
import { json, fail, readBody, sameOrigin, sessionFrom, newToken } from '../../lib/http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s || s.role !== 'admin') return fail(res, 403, 'Administrator access required.');
  if (req.method === 'GET') return json(res, 200, { ok: true, requests: await listAccessRequests() });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return fail(res, 405, 'Method not allowed'); }
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  if (!store().writable) return fail(res, 503, 'The account store is read-only on this deployment.');
  try {
    const b = await readBody(req);
    const r = await getAccessRequest(String(b.id || ''));
    if (!r) return fail(res, 404, 'No such request.');
    if (r.status !== 'pending') return fail(res, 400, `This request was already ${r.status}.`);
    const portal = getPortal(r.portal);
    if (b.action === 'decline') {
      await updateAccessRequest(r.id, { status: 'declined', reviewedAt: new Date().toISOString(), reviewedBy: s.email });
      return json(res, 200, { ok: true });
    }
    if (b.action !== 'approve') return fail(res, 400, 'action must be approve or decline.');
    const f = r.fields;
    let user = await findUser(f.email);
    if (!user) user = await createUser({ email: f.email, name: f.name, role: portal.role, org: f.organisation, status: 'pending' });
    const token = newToken();
    await tokens.put('reset', token, { email: user.email, portal: portal.id }, 7 * 86400);
    await updateAccessRequest(r.id, { status: 'approved', reviewedAt: new Date().toISOString(), reviewedBy: s.email });
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const link = `${origin}/portal/${portal.id}/reset.html?token=${token}`;
    const mail = await sendMail({
      to: user.email, subject: `Your Aho Farms ${portal.name} access`,
      text: `Kia ora ${user.name},\n\nYour request for access to the Aho Farms ${portal.name} has been approved. Choose your password with this link (valid for seven days):\n\n${link}\n\nAho Farms`,
    });
    return json(res, 200, { ok: true, user: { email: user.email, role: user.role }, setPasswordUrl: link, emailed: mail.sent });
  } catch (e) { return fail(res, 400, e.message); }
}

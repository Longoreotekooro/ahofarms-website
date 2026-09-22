// Administrator view of consumer leads and referral status (role 'admin').
//   GET   /api/admin/leads                 newest first
//   PATCH /api/admin/leads { id, status }  new | reviewed | matched | referred | completed
import { listLeads, updateLead } from '../../users.js';
import { json, fail, readBody, sameOrigin, sessionFrom } from '../../http.js';

import { LEAD_STATUSES as STATUSES } from '../../partners.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s || s.role !== 'admin') return fail(res, 403, 'Administrator access required.');
  if (req.method === 'GET') return json(res, 200, { ok: true, leads: await listLeads() });
  if (req.method !== 'PATCH') { res.setHeader('Allow', 'GET, PATCH'); return fail(res, 405, 'Method not allowed'); }
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  try {
    const b = await readBody(req);
    if (!STATUSES.includes(b.status)) return fail(res, 400, `status must be one of ${STATUSES.join(', ')}`);
    return json(res, 200, { ok: true, lead: await updateLead(String(b.id || ''), { status: b.status, reviewedBy: s.email, reviewedAt: new Date().toISOString() }) });
  } catch (e) { return fail(res, 400, e.message); }
}

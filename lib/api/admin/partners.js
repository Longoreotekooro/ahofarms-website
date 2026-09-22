// Administrator management of prescriber partners (role 'admin').
//   GET    /api/admin/partners           list (all statuses)
//   POST   /api/admin/partners           create or update { id?, country, region?, name, referralUrl, contactEmail, intro, status }
//   DELETE /api/admin/partners?id=...    remove
import { listPartners, savePartner, removePartner, store } from '../../users.js';
import { COUNTRIES, REGIONS } from '../../markets.js';
import { json, fail, readBody, sameOrigin, sessionFrom, safeError } from '../../http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s || s.role !== 'admin') return fail(res, 403, 'Administrator access required.');
  if (req.method !== 'GET' && !sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  try {
    if (req.method === 'GET') return json(res, 200, { ok: true, partners: await listPartners(), durable: store().writable, countries: COUNTRIES, regions: REGIONS });
    if (req.method === 'POST') return json(res, 200, { ok: true, partner: await savePartner(await readBody(req)) });
    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return fail(res, 400, 'id is required.');
      await removePartner(id);
      return json(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return fail(res, 405, 'Method not allowed');
  } catch (e) { return fail(res, 400, safeError(e)); }
}

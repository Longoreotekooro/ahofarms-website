// Administrator management of the Find a Prescriber directory (role 'admin').
//   GET    /api/admin/providers            list (including hidden and whether samples are showing)
//   POST   /api/admin/providers            create or update ({ id? , name, type, country, region, city, telehealth, inPerson, website, booking, phone, description, status })
//   DELETE /api/admin/providers?id=...     remove
import { listProviders, saveProvider, removeProvider, store } from '../../lib/users.js';
import { COUNTRIES, REGIONS } from '../../lib/providers.js';
import { json, fail, readBody, sameOrigin, sessionFrom } from '../../lib/http.js';

export default async function handler(req, res) {
  const s = await sessionFrom(req);
  if (!s || s.role !== 'admin') return fail(res, 403, 'Administrator access required.');
  if (req.method !== 'GET' && !sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  try {
    if (req.method === 'GET') {
      const list = await listProviders({ includeHidden: true });
      return json(res, 200, { ok: true, providers: list, sample: list.some(p => p.sample), durable: store().writable, countries: COUNTRIES, regions: REGIONS });
    }
    if (req.method === 'POST') { const p = await saveProvider(await readBody(req)); return json(res, 200, { ok: true, provider: p }); }
    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return fail(res, 400, 'id is required.');
      await removeProvider(id);
      return json(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return fail(res, 405, 'Method not allowed');
  } catch (e) { return fail(res, 400, e.message); }
}

// GET /api/directory/providers — the public Find a Prescriber directory.
// Active listings only; filtering happens in the browser (the list is small).
import { listProviders } from '../../lib/users.js';
import { publicProvider } from '../../lib/providers.js';
import { COUNTRIES, REGIONS, CONSULTATION_TYPES } from '../../lib/providers.js';
import { json } from '../../lib/http.js';

export default async function handler(req, res) {
  const list = (await listProviders()).map(publicProvider);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return json(res, 200, { ok: true, providers: list, countries: COUNTRIES, regions: REGIONS, consultationTypes: CONSULTATION_TYPES, sample: list.some(p => p.sample) }, { 'Cache-Control': 'public, max-age=60, s-maxage=300' });
}

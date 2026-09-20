// The Find a Prescriber directory: independent clinics and prescribers a
// consumer can book with. Aho Farms lists them; it does not assess,
// prescribe or book. Records live in the store (admins add and remove
// them with scripts/portal-admin.js or /api/admin/providers); until the
// store holds any, the SAMPLE entries below are shown, clearly labelled,
// so the page and its filters can be seen working.
//
//   { id, name, type: 'clinic' | 'prescriber', country, region, city,
//     telehealth: bool, inPerson: bool, website, booking, phone,
//     description, status: 'active' | 'hidden', sample?: true }

export const COUNTRIES = ['New Zealand', 'Australia', 'Germany', 'United Kingdom'];

export const REGIONS = {
  'New Zealand': ['Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', "Hawke's Bay", 'Taranaki', 'Manawatū-Whanganui', 'Wellington', 'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 'Otago', 'Southland', 'Nationwide (telehealth)'],
  'Australia': ['New South Wales', 'Victoria', 'Queensland', 'Western Australia', 'South Australia', 'Tasmania', 'ACT', 'Northern Territory', 'Nationwide (telehealth)'],
  'Germany': ['Berlin', 'Bavaria', 'North Rhine-Westphalia', 'Hamburg', 'Hesse', 'Baden-Württemberg', 'Nationwide (telehealth)'],
  'United Kingdom': ['London', 'South East', 'South West', 'Midlands', 'North West', 'North East', 'Scotland', 'Wales', 'Northern Ireland', 'Nationwide (telehealth)'],
};

export const CONSULTATION_TYPES = ['Telehealth', 'In person', 'Either'];

const sample = (id, name, region, city, telehealth, inPerson, description) => ({
  id, name, type: 'clinic', country: 'New Zealand', region, city, telehealth, inPerson,
  website: 'https://example.com', booking: 'https://example.com/book', phone: '',
  description, status: 'active', sample: true,
});

// Placeholders only. Replace with real participating clinics and prescribers.
export const SAMPLE_PROVIDERS = [
  sample('sample-1', 'Sample clinic · Auckland central', 'Auckland', 'Auckland', true, true, 'A placeholder listing showing how a clinic with both telehealth and in-person consultations appears.'),
  sample('sample-2', 'Sample telehealth service', 'Nationwide (telehealth)', 'Online', true, false, 'A placeholder for a nationwide telehealth prescriber. Consultations by video from anywhere in New Zealand.'),
  sample('sample-3', "Sample clinic · Hawke's Bay", "Hawke's Bay", 'Napier', false, true, 'A placeholder in-person clinic listing.'),
  sample('sample-4', 'Sample clinic · Wellington', 'Wellington', 'Wellington', true, true, 'A placeholder listing with telehealth and in-person options.'),
  sample('sample-5', 'Sample clinic · Christchurch', 'Canterbury', 'Christchurch', true, true, 'A placeholder listing for the South Island.'),
];

const strip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const url = s => { const v = strip(s, 300); if (!v) return ''; try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch { return ''; } };

// Validates and normalises an admin-supplied record. Throws on problems.
export function normaliseProvider(input, existing = {}) {
  const p = { ...existing, ...input };
  const out = {
    id: strip(p.id, 80) || undefined,
    name: strip(p.name, 120),
    type: p.type === 'prescriber' ? 'prescriber' : 'clinic',
    country: COUNTRIES.includes(p.country) ? p.country : '',
    region: strip(p.region, 80),
    city: strip(p.city, 80),
    telehealth: p.telehealth === true || p.telehealth === 'true' || p.telehealth === '1',
    inPerson: p.inPerson === true || p.inPerson === 'true' || p.inPerson === '1',
    website: url(p.website),
    booking: url(p.booking),
    phone: strip(p.phone, 40),
    description: strip(p.description, 400),
    status: p.status === 'hidden' ? 'hidden' : 'active',
  };
  if (!out.name) throw new Error('name is required');
  if (!out.country) throw new Error(`country must be one of: ${COUNTRIES.join(', ')}`);
  if (!out.region) throw new Error('region is required');
  if (!out.telehealth && !out.inPerson) throw new Error('set telehealth and/or inPerson');
  if (!out.website && !out.booking) throw new Error('a website or booking link is required');
  return out;
}

// What the public directory endpoint sends: active records only, no admin fields.
export function publicProvider(p) {
  const { status, ...rest } = p;
  return rest;
}

// The portal registry: the single source of truth for which protected
// environments exist, which account role each one admits, how it is
// described, and which fields its Request Access form collects.
//
// Adding a portal type later is one entry here (plus a role name); the
// login pages, request-access forms, middleware, nav and dashboards all
// read from this list. Runs in Node (API) and on the Edge (middleware),
// so keep it dependency-free.

export const ROLES = ['prescriber', 'pharmacy', 'export_partner', 'admin'];

// Markets Aho Farms serves (CEO, 2026-09-20): lib/markets.js. Every
// request form asks for one; add a market there and all forms pick it up.
import { COUNTRIES } from './markets.js';
export { COUNTRIES };
const countryField = { name: 'country', label: 'Country', type: 'select', required: true, options: COUNTRIES, autocomplete: 'country-name' };

export const PORTALS = [
  {
    id: 'prescriber',
    role: 'prescriber',
    name: 'Prescriber Portal',
    short: 'Prescribers',
    mi: 'Ngā Kaitohu Rongoā',          // PROVISIONAL te reo, pending review
    audience: 'healthcare professionals',
    tagline: 'Access clinical, product and prescribing resources from Aho Farms.',
    intro: 'For registered New Zealand medical practitioners, nurse prescribers and pharmacist prescribers. Product specifications, Certificates of Analysis, cannabinoid and terpene profiles, prescriber guides and clinical resources in one place.',
    support: { email: 'prescribers@ahofarms.co.nz', label: 'Prescriber support' },
    eligibility: 'Access is verified against the relevant New Zealand professional register before approval.',
    requestFields: [
      { name: 'name',         label: 'Full name',                       type: 'text',  required: true, autocomplete: 'name' },
      { name: 'email',        label: 'Email',                           type: 'email', required: true, autocomplete: 'email' },
      { name: 'organisation', label: 'Clinic / organisation',           type: 'text',  required: true, autocomplete: 'organization' },
      countryField,
      { name: 'profession',   label: 'Profession',                      type: 'select', required: true,
        options: ['General practitioner', 'Specialist', 'Nurse prescriber', 'Pharmacist prescriber', 'Other registered prescriber'] },
      { name: 'registration', label: 'Prescriber registration details', type: 'text',  required: false, hint: 'Registration number and register, if applicable.' },
      { name: 'phone',        label: 'Phone number',                    type: 'tel',   required: true, autocomplete: 'tel' },
      { name: 'message',      label: 'Message',                         type: 'textarea', required: false, hint: 'Anything that helps us set up your access.' },
    ],
  },
  {
    id: 'pharmacy',
    role: 'pharmacy',
    name: 'Pharmacy Portal',
    short: 'Pharmacies',
    mi: 'Ngā Whare Rongoā',            // PROVISIONAL te reo, pending review
    audience: 'pharmacy teams',
    tagline: 'Product, supply and ordering information for pharmacy teams stocking Aho Farms.',
    intro: 'For New Zealand pharmacies dispensing Aho Farms medicines. Current range, specifications, Certificates of Analysis, availability, wholesale and ordering information, and supply updates, without the clinical detail in the way.',
    support: { email: 'pharmacies@ahofarms.co.nz', label: 'Supply enquiries' },
    eligibility: 'Access is granted to licensed New Zealand pharmacies after verification.',
    requestFields: [
      { name: 'name',         label: 'Full name',        type: 'text',  required: true, autocomplete: 'name' },
      { name: 'organisation', label: 'Pharmacy name',    type: 'text',  required: true, autocomplete: 'organization' },
      { name: 'email',        label: 'Email',            type: 'email', required: true, autocomplete: 'email' },
      { name: 'phone',        label: 'Phone number',     type: 'tel',   required: true, autocomplete: 'tel' },
      { name: 'address',      label: 'Pharmacy address', type: 'textarea', required: true, rows: 2, autocomplete: 'street-address' },
      countryField,
      { name: 'role',         label: 'Your role',        type: 'select', required: true,
        options: ['Pharmacist', 'Pharmacy owner', 'Pharmacy manager', 'Dispensary technician', 'Other'] },
      { name: 'message',      label: 'Message',          type: 'textarea', required: false },
    ],
  },
  {
    id: 'export-partner',
    role: 'export_partner',
    name: 'Export Partner Portal',
    short: 'Export Partners',
    mi: 'Ngā Hoa Kaweake',              // PROVISIONAL te reo, pending review
    audience: 'international partners',
    tagline: 'Catalogue, capability and due-diligence documentation for international supply partners.',
    intro: 'For qualified international distributors, importers and licensed operators. Export catalogue, cultivars, production, bulk specifications, Certificates of Analysis, quality and compliance documentation, capacity and market information.',
    support: { email: 'partners@ahofarms.co.nz', label: 'International supply' },
    eligibility: 'Access is granted to verified licensed operators in permitted markets.',
    requestFields: [
      { name: 'name',         label: 'Full name',       type: 'text',  required: true, autocomplete: 'name' },
      { name: 'organisation', label: 'Company',         type: 'text',  required: true, autocomplete: 'organization' },
      countryField,
      { name: 'email',        label: 'Email',           type: 'email', required: true, autocomplete: 'email' },
      { name: 'phone',        label: 'Phone number',    type: 'tel',   required: true, autocomplete: 'tel' },
      { name: 'businessType', label: 'Business type',   type: 'select', required: true,
        options: ['Importer / distributor', 'Licensed producer', 'Pharmaceutical wholesaler', 'Brand / product company', 'Other'] },
      { name: 'markets',      label: 'Markets of interest',            type: 'text', required: true, hint: 'Countries or regions you supply.' },
      { name: 'requirements', label: 'Estimated product requirements', type: 'text', required: false, hint: 'Indicative volumes, formats and timing.' },
      { name: 'message',      label: 'Message',         type: 'textarea', required: false },
    ],
  },
];

// The Consumer Portal is public: no account, no role. It sits under
// /portal/consumers/ so the Portals gateway is one place, but the guard
// lets every request through.
export const CONSUMER = {
  id: 'consumers',
  name: 'Consumer Portal',
  short: 'Consumers',
  mi: 'Ngā Kiritaki',                 // PROVISIONAL te reo, pending review
  tagline: 'Understand the access pathway and get connected to an approved prescriber partner in your country.',
  support: { email: 'hello@ahofarms.co.nz', label: 'General enquiries' },
};
export const PUBLIC_PORTAL_IDS = new Set([CONSUMER.id]);

export const ADMIN_ROLE = 'admin';

export function getPortal(id) {
  return PORTALS.find(p => p.id === id) || null;
}
export function portalForRole(role) {
  return PORTALS.find(p => p.role === role) || null;
}
export function portalHome(p) { return `/portal/${p.id}/home`; }
export function portalPath(p) { return `/portal/${p.id}/`; }
export function portalLogin(p) { return `/portal/${p.id}/login`; }

// Can an account with `role` enter portal `p`? Admin enters all.
export function roleAllows(role, p) {
  return role === ADMIN_ROLE || role === p.role;
}

// Paths under /portal/<id>/ that are public (no session needed).
export const PUBLIC_PORTAL_PAGES = new Set(['login', 'request-access', 'forgot', 'reset']);

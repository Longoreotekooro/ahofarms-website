// Approved prescriber partners, one pathway per market, and the consumer
// leads routed to them. Nothing here is ever sent to the browser before a
// consumer has submitted the form; after that the consumer sees only their
// own partner's next step (a tracked link / QR code, or "we'll be in touch").
//
//   partner: { id, country, region?, name, referralUrl, contactEmail, intro,
//              status: 'active' | 'inactive', updatedAt }
//     region: optional; a partner with a region wins over a country-wide one.
//     referralUrl: the partner's booking / intake page. The consumer never
//       sees it directly: the referral link is /r/<code> on the Aho site,
//       which records the hand-off and redirects with ?ref=<code>.
//     contactEmail: where Aho-managed introductions are sent.
//     intro: one line shown to the consumer with their next step.
//
//   lead:    { id, code, name, email, phone, country, region, contactMethod,
//              message, consent: { referral, marketing }, partnerId,
//              status: 'new' | 'referred' | 'handed-off' | 'contacted' | 'closed',
//              createdAt, referredAt, handoffAt, introEmailed, meta }
import { randomBytes } from 'node:crypto';
import { COUNTRIES, CONTACT_METHODS } from './markets.js';

const strip = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const url = s => { const v = strip(s, 400); if (!v) return ''; try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch { return ''; } };
const isEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ''));

export function normalisePartner(input, existing = {}) {
  const p = { ...existing, ...input };
  const out = {
    id: strip(p.id, 80) || undefined,
    country: COUNTRIES.includes(p.country) ? p.country : '',
    region: strip(p.region, 80),
    name: strip(p.name, 120),
    referralUrl: url(p.referralUrl),
    contactEmail: strip(p.contactEmail, 200).toLowerCase(),
    intro: strip(p.intro, 300),
    status: p.status === 'inactive' ? 'inactive' : 'active',
  };
  if (!out.name) throw new Error('name is required');
  if (!out.country) throw new Error(`country must be one of: ${COUNTRIES.join(', ')}`);
  if (out.contactEmail && !isEmail(out.contactEmail)) throw new Error('contactEmail is not a valid email');
  if (!out.referralUrl && !out.contactEmail) throw new Error('a referralUrl or a contactEmail is required');
  return out;
}

// The partner for a lead: region-specific first, then country-wide.
export function pickPartner(partners, country, region) {
  const active = partners.filter(p => p.status === 'active' && p.country === country);
  return active.find(p => p.region && region && p.region.toLowerCase() === region.toLowerCase())
      || active.find(p => !p.region)
      || active[0] || null;
}

// Referral codes: short, unguessable, URL-safe, unambiguous characters.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function newReferralCode() {
  const b = randomBytes(10);
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[b[i] % ALPHABET.length];
  return s;
}
export const REFERRAL_CODE_RE = /^[a-z2-9]{10}$/;

export function validateLead(b) {
  const fields = {
    name: strip(b.name, 120),
    email: strip(b.email, 200).toLowerCase(),
    phone: strip(b.phone, 40),
    country: strip(b.country, 40),
    region: strip(b.region, 80),
    contactMethod: strip(b.contactMethod, 20),
    message: strip(b.message, 1000),
  };
  const errors = {};
  if (!fields.name) errors.name = 'Your name is required.';
  if (!isEmail(fields.email)) errors.email = 'Enter a valid email address.';
  if (!COUNTRIES.includes(fields.country)) errors.country = 'Choose your country.';
  if (!fields.region) errors.region = 'Tell us your region or state.';
  if (!CONTACT_METHODS.includes(fields.contactMethod)) errors.contactMethod = 'Choose how you would like to be contacted.';
  if (fields.contactMethod !== 'Email' && !fields.phone) errors.phone = 'Add a phone number, or choose email contact.';
  const consentReferral = b.consentReferral === true || b.consentReferral === 'on' || b.consentReferral === 'true';
  const consentMarketing = b.consentMarketing === true || b.consentMarketing === 'on' || b.consentMarketing === 'true';
  if (!consentReferral) errors.consentReferral = 'We need your consent to store your details and pass them to a prescriber partner.';
  return { fields, consent: { referral: consentReferral, marketing: consentMarketing }, errors };
}

// What the consumer is shown after submitting: never the partner's raw URL.
export function referralView(lead, partner, origin) {
  if (!partner) return { status: 'pending', partnerName: null };
  const link = `${origin}/r/${lead.code}`;
  return {
    status: 'referred',
    partnerName: partner.name,
    intro: partner.intro || '',
    link: partner.referralUrl ? link : null,
    code: lead.code,
    introEmailed: !!lead.introEmailed,
  };
}

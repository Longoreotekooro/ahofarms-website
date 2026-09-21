// POST /api/consumers/connect — the consumer lead-capture and referral step.
// Validates the form, stores the lead with consent, assigns the approved
// partner for the consumer's country (region-specific partner first),
// sends the Aho-managed introductions when mail is configured, and returns
// ONLY the consumer's own next step: a tracked /r/<code> link (rendered as
// a button and a QR code by the page), or a "we'll be in touch" state.
// Partner details are never exposed before this point, and the partner's
// own URL is never sent to the browser at all.
import { createLead, updateLead } from '../../users.js';
import { validateLead, referralView } from '../../partners.js';
import { sendMail, adminRecipients } from '../../mail.js';
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, clip, isSecure } from '../../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  const b = await readBody(req);
  if (String(b.website || '')) return json(res, 200, { ok: true, referral: { status: 'pending' } }); // honeypot
  if (await limited(`connect:${clientIp(req)}`, 6, 3600)) return fail(res, 429, 'Too many requests from this connection. Please try again later.');

  const { fields, consent, errors } = validateLead(b);
  if (Object.keys(errors).length) return fail(res, 400, 'Please check the highlighted fields.', { fields: errors });

  const { lead, partner } = await createLead(fields, consent, { ip: clientIp(req), ua: clip(req.headers['user-agent'], 200), source: clip(b.source, 100) || 'consumer-portal' });
  const origin = `${isSecure(req) ? 'https' : 'http'}://${req.headers.host}`;
  const link = `${origin}/r/${lead.code}`;
  const via = lead.contactMethod === 'Either' ? 'email or phone' : lead.contactMethod.toLowerCase();

  // Aho-managed introductions (consumer + partner), when a transport exists.
  if (partner) {
    const toConsumer = await sendMail({
      to: lead.email,
      subject: `Your introduction to ${partner.name}`,
      text: `Kia ora ${lead.name},\n\nThank you for your enquiry. Aho Farms has connected you with ${partner.name}, an independent prescriber partner for ${lead.country}.\n\n${partner.intro ? partner.intro + '\n\n' : ''}${partner.referralUrl ? `Your referral link (also shown on the page you used, as a QR code):\n${link}\n\n` : 'They will be in touch using the contact method you chose.\n\n'}${partner.name} will assess whether medicinal cannabis is appropriate for you. Aho Farms does not prescribe, diagnose or guarantee a prescription.\n\nReference: ${lead.code}\n\nAho Farms`,
    });
    if (partner.contactEmail) {
      await sendMail({
        to: partner.contactEmail,
        subject: `New referral from Aho Farms (${lead.country}${lead.region ? ', ' + lead.region : ''}) · ${lead.code}`,
        text: `Aho Farms has referred a consumer to you.\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone || '-'}\nCountry / region: ${lead.country} / ${lead.region}\nPreferred contact: ${lead.contactMethod}\nMessage: ${lead.message || '-'}\nReference: ${lead.code}\n\nThey have consented to Aho Farms sharing these details with you for the purpose of arranging a consultation.`,
      });
    }
    if (toConsumer.sent) await updateLead(lead.id, { introEmailed: true });
    lead.introEmailed = toConsumer.sent;
  }
  await sendMail({
    to: adminRecipients(),
    subject: `Consumer lead · ${lead.country} · ${partner ? 'referred to ' + partner.name : 'NO PARTNER for this market'}`,
    text: `Lead ${lead.id} (ref ${lead.code})\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone || '-'}\nCountry / region: ${lead.country} / ${lead.region}\nPreferred contact: ${lead.contactMethod}\nMarketing consent: ${consent.marketing ? 'yes' : 'no'}\nMessage: ${lead.message || '-'}\nStatus: ${lead.status}\n\nReview with: node scripts/portal-admin.js leads`,
  });
  console.log(`[lead] ${lead.id} ${lead.country} -> ${partner ? partner.id : 'no-partner'}`);

  const referral = referralView(lead, partner, origin);
  const message = partner
    ? (partner.referralUrl
        ? `Use the link or QR code below to continue with ${partner.name}, the approved prescriber partner for ${lead.country}.`
        : `${partner.name}, the approved prescriber partner for ${lead.country}, will be in touch by ${via}.`)
    : `We don't have an approved prescriber partner in ${lead.country} online yet, so the Aho Farms team will be in touch by ${via} with your next step.`;
  return json(res, 200, { ok: true, message, referral });
}

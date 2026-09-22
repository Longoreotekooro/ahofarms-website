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
import { sendMail } from '../../mail.js';
import { isAvailable } from '../../flags.js';

// Every enquiry goes to the Aho consumer lead inbox.
// Default recipients: admin@ahofarms.com (launch brief, 2026-09-22) and korijames@ahofarms.com (portal brief, 2026-09-21). Override with LEADS_TO.
const LEADS_TO = () => String(process.env.LEADS_TO || 'admin@ahofarms.com,korijames@ahofarms.com').split(',').map(x => x.trim()).filter(Boolean);
import { json, fail, readBody, requireMethod, sameOrigin, clientIp, limited, clip, isSecure } from '../../http.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'POST')) return;
  if (!sameOrigin(req)) return fail(res, 403, 'Cross-site request refused.');
  if (!isAvailable('consumers')) return fail(res, 404, 'Not available.');
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
  let referredAt = null;
  if (partner) {
    referredAt = new Date().toISOString();
    const toConsumer = await sendMail({
      to: lead.email,
      subject: partner.referralUrl ? `Your next step with ${partner.name}` : 'Your Aho Farms enquiry has been received',
      text: `Kia ora ${lead.firstName},\n\nThank you for your enquiry. We've captured your details and matched you with ${partner.name}, an approved independent prescriber partner for ${lead.country}.\n\n${partner.intro ? partner.intro + '\n\n' : ''}${partner.referralUrl ? `Continue to the prescriber here (also shown on the page you used, as a QR code):\n${link}\n\n` : 'They will be in touch using the contact method you chose.\n\n'}Clinical suitability and any prescribing decision remain with the independent healthcare professional. Aho Farms does not prescribe, diagnose or guarantee a prescription.\n\nReference: ${lead.code}\n\nAho Farms`,
    });
    if (partner.contactEmail) {
      await sendMail({
        to: partner.contactEmail,
        subject: `New referral from Aho Farms (${lead.country}${lead.region ? ', ' + lead.region : ''}) · ${lead.code}`,
        text: `Aho Farms has referred a consumer to you.\n\nName: ${lead.name}\nEmail: ${lead.email}\nMobile: ${lead.phone}\nCountry / region: ${lead.country} / ${lead.region}\nPreferred contact: ${lead.contactMethod || '-'}\nTelehealth preference: ${lead.telehealth || '-'}\nMessage: ${lead.message || '-'}\nReference: ${lead.code}\n\nThey have confirmed they meet the age requirement and consented to Aho Farms sharing these details with you for the purpose of arranging a consultation.`,
      });
    }
    await updateLead(lead.id, { status: 'referred', referredAt, introEmailed: toConsumer.sent });
    lead.status = 'referred'; lead.referredAt = referredAt; lead.introEmailed = toConsumer.sent;
  }

  // Notification to the Aho team for every enquiry.
  const notify = await sendMail({
    to: LEADS_TO(),
    subject: `New Consumer Portal Enquiry — ${lead.country} — ${lead.name}`,
    text: [
      'A new enquiry has been received through the Consumer Portal.', '',
      `Lead ID: ${lead.id}`, `Reference code: ${lead.code}`, `Customer name: ${lead.name}`, `Email: ${lead.email}`, `Phone number: ${lead.phone}`,
      `Country: ${lead.country}`, `Region: ${lead.region}`, `Preferred contact method: ${lead.contactMethod || '-'}`, `Telehealth preference: ${lead.telehealth || '-'}`,
      `How they heard about Aho Farms: ${lead.heardAbout || '-'}`, `Referral source: ${lead.source}${lead.campaign ? ' · campaign ' + lead.campaign : ''}${lead.referrer ? ' · from ' + lead.referrer : ''}`,
      `Submission date: ${lead.createdAt}`, `Age requirement confirmed: yes`, `Marketing consent: ${consent.marketing ? 'yes' : 'no'}`, '',
      `Assigned prescriber partner: ${partner ? partner.name : 'NONE for this market — manual introduction needed'}`,
      `Referral method: ${lead.referralMethod}`, `Current referral status: ${lead.status}`, '',
      `Message: ${lead.message || '-'}`, '',
      'Review and update: node scripts/portal-admin.js leads',
    ].join('\n'),
  });
  if (!notify.sent) console.warn(`[lead] notification not sent (no mail transport): ${lead.id}`);
  console.log(`[lead] ${lead.id} ${lead.country} -> ${partner ? partner.id : 'no-partner'} (${lead.referralMethod})`);

  const referral = referralView(lead, partner, origin);
  const message = partner
    ? (partner.referralUrl
        ? `We've matched you with ${partner.name}, an approved independent prescriber partner for ${lead.country}. Continue with the button, or scan the code on your phone.`
        : `We've matched you with ${partner.name}, an approved independent prescriber partner for ${lead.country}. They will contact you by ${via}.`)
    : `Our team will contact you by ${via} with the appropriate next step for ${lead.country}.`;
  return json(res, 200, { ok: true, message, referral });
}

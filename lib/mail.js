// Outbound mail. Sends through Resend when RESEND_API_KEY is set (MAIL_FROM
// is the sender), otherwise logs and reports { sent: false } so callers can
// fall back to a manual path. Swap the transport here; nothing else changes.
export async function sendMail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Aho Farms Portals <portals@ahofarms.co.nz>';
  if (!key) {
    console.log(`[mail:skipped] to=${to} subject=${JSON.stringify(subject)}`);
    return { sent: false, reason: 'no mail transport configured' };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [].concat(to), subject, text, html: html || undefined }),
  });
  if (!res.ok) { console.error('[mail:error]', res.status, await res.text()); return { sent: false, reason: `transport ${res.status}` }; }
  return { sent: true };
}

export function adminRecipients() {
  return String(process.env.ACCESS_REQUEST_TO || 'hello@ahofarms.co.nz').split(',').map(s => s.trim()).filter(Boolean);
}

// Outbound mail. Sends through Resend when RESEND_API_KEY is set (MAIL_FROM
// is the sender), otherwise logs and reports { sent: false } so callers can
// fall back to a manual path. Swap the transport here; nothing else changes.
export async function sendMail({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'Aho Farms Portals <portals@ahofarms.co.nz>';
  if (!key) {
    console.warn('[mail:skipped] no mail transport configured');
    return { sent: false, reason: 'no mail transport configured' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [].concat(to), subject, text, html: html || undefined }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { console.error('[mail:error]', res.status); return { sent: false, reason: `transport ${res.status}` }; }
    const result = await res.json();
    if (!result || typeof result.id !== 'string' || !result.id) return { sent: false, reason: 'missing transport receipt' };
    return { sent: true };
  } catch (_) {
    console.error('[mail:error] transport unavailable');
    return { sent: false, reason: 'transport unavailable' };
  }
}

export function adminRecipients() {
  return String(process.env.ACCESS_REQUEST_TO || 'admin@ahofarms.com').split(',').map(s => s.trim()).filter(Boolean);
}

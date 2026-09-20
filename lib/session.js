// Signed session tokens. Web Crypto only, so the same module verifies on
// the Edge (middleware.js) and in Node (api/*). The token is
// base64url(payload) + '.' + base64url(HMAC-SHA256(payload, SESSION_SECRET))
// and carries no secret data: id, email, name, role, org, issued/expiry.
//
// The cookie is HttpOnly + Secure + SameSite=Lax so page scripts never see
// it; a second, non-HttpOnly cookie carries only the role as a UI hint so
// the header can render "My Portal" before any request is made. That hint
// grants nothing: every protected page and API re-verifies the signed cookie.

export const SESSION_COOKIE = 'aho_portal';
export const HINT_COOKIE = 'aho_portal_ui';
export const SESSION_HOURS = 12;
export const REMEMBER_DAYS = 30;
export const TOKEN_VERSION = 1;

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function getSecret() {
  const s = (typeof process !== 'undefined' && process.env && process.env.SESSION_SECRET) || '';
  return s.length >= 32 ? s : null;
}

export async function signSession(claims, { remember = false } = {}) {
  const secret = getSecret();
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const now = Math.floor(Date.now() / 1000);
  const ttl = remember ? REMEMBER_DAYS * 86400 : SESSION_HOURS * 3600;
  const payload = { v: TOKEN_VERSION, ...claims, iat: now, exp: now + ttl, rem: remember ? 1 : 0 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body));
  return { token: `${body}.${b64url(new Uint8Array(sig))}`, payload, maxAge: ttl };
}

// Returns the claims or null. Never throws on bad input.
export async function verifySession(token) {
  try {
    const secret = getSecret();
    if (!secret || !token || typeof token !== 'string') return null;
    const dot = token.indexOf('.');
    if (dot < 1) return null;
    const body = token.slice(0, dot), sig = token.slice(dot + 1);
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (claims.v !== TOKEN_VERSION) return null;
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
    if (!claims.sub || !claims.role) return null;
    return claims;
  } catch { return null; }
}

export function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (k) out[k] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

// Set-Cookie strings for a signed-in session, and for clearing it.
export function sessionCookies(token, maxAge, role, { secure = true } = {}) {
  const base = `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? '; Secure' : ''}`;
  return [
    `${SESSION_COOKIE}=${token}; ${base}; HttpOnly`,
    `${HINT_COOKIE}=${encodeURIComponent(role)}; ${base}`,
  ];
}
export function clearCookies({ secure = true } = {}) {
  const base = `Path=/; Max-Age=0; SameSite=Lax${secure ? '; Secure' : ''}`;
  return [`${SESSION_COOKIE}=; ${base}; HttpOnly`, `${HINT_COOKIE}=; ${base}`];
}

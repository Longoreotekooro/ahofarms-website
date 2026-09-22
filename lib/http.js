// Small helpers for Vercel Node functions: JSON bodies, cookies, errors,
// rate limits and the session lookup every protected endpoint uses.
import { randomBytes } from 'node:crypto';
import { parseCookies, verifySession, SESSION_COOKIE } from './session.js';
import { counters } from './users.js';

export function json(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}
export function fail(res, status, message, extra = {}) {
  return json(res, status, { ok: false, error: message, ...extra });
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  const type = String(req.headers['content-type'] || '');
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw));
  try { return JSON.parse(raw); } catch { return {}; }
}

export function isSecure(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const host = String(req.headers.host || '');
  if (proto) return proto === 'https';
  return !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}
export function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
}
export function requireMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader('Allow', method);
  fail(res, 405, 'Method not allowed');
  return false;
}
// Same-origin check for state-changing requests (defence in depth beside
// SameSite=Lax cookies). Fetch sends Origin on every cross-origin request.
export function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers.host;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function sessionFrom(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies[SESSION_COOKIE]);
}

// Best-effort limiter: `max` hits per `windowSec` for the key. Durable
// when the Redis store is configured, per-instance otherwise.
export async function limited(key, max, windowSec, { failClosed = false } = {}) {
  try { return (await counters.incr(`rl:${key}`, windowSec)) > max; }
  catch (e) { console.error('rate limiter unavailable:', e && e.message); return failClosed; }
}
// Error messages safe to show a client: validation errors pass through,
// store/transport failures are replaced with a fixed message and logged.
export function safeError(e) {
  const m = (e && e.message) || '';
  if (/^store:|fetch failed|ECONN|ETIMEDOUT/i.test(m)) { console.error('backend error:', m); return 'The account store is unavailable right now. Please try again shortly.'; }
  return m || 'Something went wrong. Please try again.';
}

export function newToken() { return randomBytes(24).toString('base64url'); }

export const isEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || ''));
export const clip = (s, n = 500) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// The account and access-request store, behind one small interface so the
// backing service can change without touching the auth flow.
//
//   users:    { id, email, name, role, org, status, passwordHash, createdAt, updatedAt }
//   status:   'active' | 'suspended' | 'pending'
//   requests: { id, portal, status, submittedAt, fields:{...}, reviewedAt?, reviewedBy? }
//
// Adapters, chosen from the environment at runtime:
//   1. Upstash/Vercel Redis via REST (KV_REST_API_URL + KV_REST_API_TOKEN, or
//      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN): read/write, so
//      admins can approve, suspend, remove and re-role accounts.
//   2. Environment JSON (PORTAL_USERS = JSON array of user records): read-only,
//      for a first deployment or a preview without a database.
// On top of either, PORTAL_ADMIN_EMAIL + PORTAL_ADMIN_PASSWORD_HASH define a
// bootstrap administrator that always exists.
import { randomUUID } from 'node:crypto';
import { ROLES } from './portals.js';

const norm = e => String(e || '').trim().toLowerCase();

/* ---------- adapter: Redis over REST ---------- */
function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}
async function redis(...cmd) {
  const env = redisEnv();
  const res = await fetch(env.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`store: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`store: ${data.error}`);
  return data.result;
}
const kv = {
  writable: true,
  async getUser(email) { const j = await redis('GET', `user:${norm(email)}`); return j ? JSON.parse(j) : null; },
  async listUsers() {
    const emails = await redis('SMEMBERS', 'users');
    if (!emails || !emails.length) return [];
    const vals = await redis('MGET', ...emails.map(e => `user:${e}`));
    return vals.filter(Boolean).map(v => JSON.parse(v));
  },
  async putUser(user) {
    await redis('SET', `user:${user.email}`, JSON.stringify(user));
    await redis('SADD', 'users', user.email);
    return user;
  },
  async deleteUser(email) { await redis('DEL', `user:${norm(email)}`); await redis('SREM', 'users', norm(email)); },
  async putRequest(r) { await redis('SET', `request:${r.id}`, JSON.stringify(r)); await redis('LPUSH', 'requests', r.id); return r; },
  async setRequest(r) { await redis('SET', `request:${r.id}`, JSON.stringify(r)); return r; },
  async getRequest(id) { const j = await redis('GET', `request:${id}`); return j ? JSON.parse(j) : null; },
  async listRequests() {
    const ids = await redis('LRANGE', 'requests', 0, 499);
    if (!ids || !ids.length) return [];
    const vals = await redis('MGET', ...ids.map(i => `request:${i}`));
    return vals.filter(Boolean).map(v => JSON.parse(v));
  },
  async putToken(kind, token, data, ttlSec) { await redis('SET', `${kind}:${token}`, JSON.stringify(data), 'EX', ttlSec); },
  async takeToken(kind, token) {
    const j = await redis('GETDEL', `${kind}:${token}`);
    return j ? JSON.parse(j) : null;
  },
  async incr(key, ttlSec) {
    const n = await redis('INCR', key);
    if (n === 1) await redis('EXPIRE', key, ttlSec);
    return n;
  },
  async listProviders() { const vals = await redis('HVALS', 'providers'); return (vals || []).map(v => JSON.parse(v)); },
  async putProvider(p) { await redis('HSET', 'providers', p.id, JSON.stringify(p)); return p; },
  async deleteProvider(id) { await redis('HDEL', 'providers', id); },
};

/* ---------- adapter: environment JSON (read-only) ---------- */
function envUsers() {
  try { return JSON.parse(process.env.PORTAL_USERS || '[]').map(u => ({ ...u, email: norm(u.email) })); }
  catch { console.error('PORTAL_USERS is not valid JSON'); return []; }
}
const memory = { tokens: new Map(), counters: new Map(), requests: [], providers: null };
const envStore = {
  writable: false,
  async getUser(email) { return envUsers().find(u => u.email === norm(email)) || null; },
  async listUsers() { return envUsers(); },
  async putUser() { throw new Error('read-only store'); },
  async deleteUser() { throw new Error('read-only store'); },
  async putRequest(r) { memory.requests.unshift(r); return r; },
  async setRequest(r) { const i = memory.requests.findIndex(x => x.id === r.id); if (i >= 0) memory.requests[i] = r; return r; },
  async getRequest(id) { return memory.requests.find(r => r.id === id) || null; },
  async listRequests() { return memory.requests; },
  async putToken(kind, token, data, ttlSec) { memory.tokens.set(`${kind}:${token}`, { data, exp: Date.now() + ttlSec * 1000 }); },
  async takeToken(kind, token) {
    const k = `${kind}:${token}`, v = memory.tokens.get(k);
    memory.tokens.delete(k);
    return v && v.exp > Date.now() ? v.data : null;
  },
  async incr(key, ttlSec) {
    const now = Date.now(), v = memory.counters.get(key);
    if (!v || v.exp < now) { memory.counters.set(key, { n: 1, exp: now + ttlSec * 1000 }); return 1; }
    v.n += 1; return v.n;
  },
  // Providers are held in memory per instance (lost on restart); the
  // Redis store is the durable option. PORTAL_PROVIDERS (JSON array) seeds it.
  async listProviders() {
    if (!memory.providers) { try { memory.providers = JSON.parse(process.env.PORTAL_PROVIDERS || '[]'); } catch { memory.providers = []; } }
    return memory.providers;
  },
  async putProvider(p) { const l = await this.listProviders(); const i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; else l.push(p); return p; },
  async deleteProvider(id) { const l = await this.listProviders(); const i = l.findIndex(x => x.id === id); if (i >= 0) l.splice(i, 1); },
};

export function store() { return redisEnv() ? kv : envStore; }
export function storeName() { return redisEnv() ? 'redis' : 'env'; }

/* ---------- bootstrap admin ---------- */
function bootstrapAdmin() {
  const email = norm(process.env.PORTAL_ADMIN_EMAIL);
  const passwordHash = process.env.PORTAL_ADMIN_PASSWORD_HASH;
  if (!email || !passwordHash) return null;
  return { id: 'admin-bootstrap', email, name: process.env.PORTAL_ADMIN_NAME || 'Aho Farms admin', role: 'admin', org: 'Aho Farms', status: 'active', passwordHash, bootstrap: true };
}

/* ---------- public API ---------- */
export async function findUser(email) {
  const e = norm(email);
  const admin = bootstrapAdmin();
  if (admin && admin.email === e) return admin;
  return store().getUser(e);
}
export async function listUsers() {
  const admin = bootstrapAdmin();
  const rest = await store().listUsers();
  return (admin ? [admin] : []).concat(rest).map(publicUser);
}
export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}
export async function createUser({ email, name, role, org, passwordHash, status = 'active' }) {
  if (!ROLES.includes(role)) throw new Error(`unknown role: ${role}`);
  const e = norm(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error('invalid email');
  if (await findUser(e)) throw new Error('an account with that email already exists');
  const now = new Date().toISOString();
  const user = { id: randomUUID(), email: e, name: String(name || '').trim() || e, role, org: String(org || '').trim(), status, passwordHash: passwordHash || null, createdAt: now, updatedAt: now };
  await store().putUser(user);
  return user;
}
export async function updateUser(email, patch) {
  const u = await store().getUser(email);
  if (!u) throw new Error('no such account');
  if (patch.role && !ROLES.includes(patch.role)) throw new Error(`unknown role: ${patch.role}`);
  if (patch.status && !['active', 'suspended', 'pending'].includes(patch.status)) throw new Error('unknown status');
  const allowed = ['name', 'role', 'org', 'status', 'passwordHash'];
  for (const k of allowed) if (k in patch) u[k] = patch[k];
  u.updatedAt = new Date().toISOString();
  await store().putUser(u);
  return u;
}
export async function removeUser(email) { return store().deleteUser(email); }

export async function saveAccessRequest(portal, fields, meta = {}) {
  const r = { id: randomUUID(), portal, status: 'pending', submittedAt: new Date().toISOString(), fields, meta };
  return store().putRequest(r);
}
export async function listAccessRequests() { return store().listRequests(); }
export async function getAccessRequest(id) { return store().getRequest(id); }
export async function updateAccessRequest(id, patch) {
  const r = await store().getRequest(id);
  if (!r) throw new Error('no such request');
  Object.assign(r, patch);
  return store().setRequest(r);
}

/* ---------- Find a Prescriber directory ---------- */
import { SAMPLE_PROVIDERS, normaliseProvider } from './providers.js';
// Public listing: the store's active records, or the labelled samples when
// the store holds none.
export async function listProviders({ includeHidden = false } = {}) {
  const stored = await store().listProviders();
  const list = stored.length ? stored : SAMPLE_PROVIDERS;
  return includeHidden ? list : list.filter(p => p.status !== 'hidden');
}
export async function saveProvider(input) {
  const stored = await store().listProviders();
  const existing = input.id ? stored.find(p => p.id === input.id) : null;
  const p = normaliseProvider(input, existing || {});
  if (!p.id) p.id = 'p-' + randomUUID().slice(0, 8);
  p.updatedAt = new Date().toISOString();
  return store().putProvider(p);
}
export async function removeProvider(id) { return store().deleteProvider(id); }

// One-time tokens (password reset / first password) and rate counters.
export const tokens = {
  put: (kind, token, data, ttlSec) => store().putToken(kind, token, data, ttlSec),
  take: (kind, token) => store().takeToken(kind, token),
};
export const counters = { incr: (key, ttlSec) => store().incr(key, ttlSec) };

// Feature flags for the staged launch (portal-flags.json). Runs on the Edge
// (middleware) and in Node (API, build scripts via dynamic import).
//
//   isProduction()     true on the live site (VERCEL_ENV=production) or when
//                      PORTAL_ENV=production is set (to rehearse locally).
//   isPublic(id)       the flag as written: what the public build exposes.
//   isAvailable(id)    whether requests for the portal are served in THIS
//                      environment: always in development / preview, only
//                      public portals in production.
import flags from '../portal-flags.json' with { type: 'json' };

const env = () => (typeof process !== 'undefined' && process.env) || {};
export function isProduction() {
  const e = env();
  return e.VERCEL_ENV === 'production' || e.PORTAL_ENV === 'production';
}
export function isPublic(id) { return !!(flags.portals[id] && flags.portals[id].public); }
export function isAvailable(id) { return isPublic(id) || !isProduction(); }
export function publicPortalIds() { return Object.keys(flags.portals).filter(isPublic); }
export function gatedInfoPages() {
  const out = {};
  for (const [page, id] of Object.entries(flags.infoPages)) if (page !== '_comment') out[page] = id;
  return out;
}
export const FLAGS = flags;

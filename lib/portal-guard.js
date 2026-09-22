// The protected-route guard, called by middleware.js (Vercel Edge Middleware).
//
// Every request under /portal/ is checked here before any file is served.
// The public pages of each portal (login, request access, forgot and reset
// password) and the /portal/ hub pass through; everything else needs a
// valid signed session whose role admits that portal (admins enter all).
// Unauthenticated requests are redirected to that portal's own login page
// with a `next` parameter; a signed-in user on the wrong portal is sent to
// their own. Portal files are never served on a failed check, so nothing
// sensitive reaches an unauthenticated browser.
import { verifySession, parseCookies, SESSION_COOKIE, clearCookies } from './session.js';
import { getPortal, roleAllows, portalForRole, PUBLIC_PORTAL_PAGES, PUBLIC_PORTAL_IDS } from './portals.js';
import { isAvailable, gatedInfoPages } from './flags.js';


// Continue to the requested file. Vercel's Edge runtime reads the
// x-middleware-next marker; any other headers are added to the response.
const next = (headers = {}) => new Response(null, { headers: { 'x-middleware-next': '1', ...headers } });

const HOME = '/portal';

export async function guard(request) {
  const url = new URL(request.url);

  // Staged launch: public information pages about an unreleased portal are
  // redirected to the public gateway on production.
  const info = gatedInfoPages();
  const rawPage0 = url.pathname.replace(/^\//, '');
  const page0 = rawPage0.endsWith('.html') ? rawPage0 : rawPage0 + '.html';
  if (info[page0] && !isAvailable(info[page0])) return Response.redirect(new URL(HOME, url).toString(), 302);

  const parts = url.pathname.replace(/^\/portal\/?/, '').split('/').filter(Boolean);

  // /portal, /portal/index and the legacy /portal/index.html: the public hub.
  if (parts.length === 0 || (parts.length === 1 && /^(?:index|index\.html)$/.test(parts[0]))) return next();

  // The Consumer Portal and its directory are public.
  if (PUBLIC_PORTAL_IDS.has(parts[0])) return next();

  const portal = getPortal(parts[0]);
  if (!portal) return new Response('Not found', { status: 404 });
  // Staged launch: an unreleased portal does not exist on production. Every
  // URL under it (login, dashboards, files) lands on the public gateway.
  if (!isAvailable(portal.id)) return Response.redirect(new URL(HOME, url).toString(), 302);
  const page = parts.slice(1).join('/').replace(/\.html$/, '');
  const session = await verifySession(parseCookies(request.headers.get('cookie'))[SESSION_COOKIE]);
  if (PUBLIC_PORTAL_PAGES.has(page)) {
    // Already signed in and permitted here: straight to the dashboard.
    if (page === 'login' && session && roleAllows(session.role, portal)) {
      return Response.redirect(new URL(`/portal/${portal.id}/home`, url).toString(), 302);
    }
    return next();
  }

  if (!session) {
    const login = new URL(`/portal/${portal.id}/login`, url);
    login.searchParams.set('next', url.pathname + url.search);
    const res = Response.redirect(login.toString(), 302);
    // a stale or tampered cookie is cleared so the header stops showing "My Portal"
    const headers = new Headers(res.headers);
    for (const c of clearCookies({ secure: url.protocol === 'https:' })) headers.append('Set-Cookie', c);
    return new Response(null, { status: 302, headers });
  }
  if (!roleAllows(session.role, portal)) {
    const own = portalForRole(session.role);
    const to = new URL(own ? `/portal/${own.id}/home` : '/portal', url);
    to.searchParams.set('notice', 'wrong-portal');
    return Response.redirect(to.toString(), 302);
  }
  // Signed in and permitted: serve the page, but never let a shared cache keep it.
  return next({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
}

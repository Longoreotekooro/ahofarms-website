// Vercel Edge Middleware: the protected routes.
//
// Every request under /portal/ is checked here before any file is served.
// The public pages of each portal (login, request access, forgot and reset
// password) and the /portal/ hub pass through; everything else needs a
// valid signed session whose role admits that portal (admins enter all).
// Unauthenticated requests are redirected to that portal's own login page
// with a `next` parameter; a signed-in user on the wrong portal is sent to
// their own. Portal files are never served on a failed check, so nothing
// sensitive reaches an unauthenticated browser.
import { verifySession, parseCookies, SESSION_COOKIE, clearCookies } from './lib/session.js';
import { getPortal, roleAllows, portalForRole, PUBLIC_PORTAL_PAGES } from './lib/portals.js';

export const config = { matcher: ['/portal/:path*'] };

// Continue to the requested file. Vercel's Edge runtime reads the
// x-middleware-next marker; any other headers are added to the response.
const next = (headers = {}) => new Response(null, { headers: { 'x-middleware-next': '1', ...headers } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/portal\/?/, '').split('/').filter(Boolean);

  // /portal or /portal/index.html: the public hub.
  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'index.html')) return next();

  const portal = getPortal(parts[0]);
  if (!portal) return new Response('Not found', { status: 404 });
  const page = parts.slice(1).join('/');
  if (PUBLIC_PORTAL_PAGES.has(page)) return next();

  const session = await verifySession(parseCookies(request.headers.get('cookie'))[SESSION_COOKIE]);
  if (!session) {
    const login = new URL(`/portal/${portal.id}/login.html`, url);
    login.searchParams.set('next', url.pathname + url.search);
    const res = Response.redirect(login.toString(), 302);
    // a stale or tampered cookie is cleared so the header stops showing "My Portal"
    const headers = new Headers(res.headers);
    for (const c of clearCookies({ secure: url.protocol === 'https:' })) headers.append('Set-Cookie', c);
    return new Response(null, { status: 302, headers });
  }
  if (!roleAllows(session.role, portal)) {
    const own = portalForRole(session.role);
    const to = new URL(own ? `/portal/${own.id}/home.html` : '/portal/', url);
    to.searchParams.set('notice', 'wrong-portal');
    return Response.redirect(to.toString(), 302);
  }
  // Signed in and permitted: serve the page, but never let a shared cache keep it.
  return next({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' });
}

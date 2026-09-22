// Vercel Edge Middleware: protects everything under /portal/. The logic
// lives in lib/portal-guard.js; this wrapper loads it lazily so that a
// failure to load or run it is logged (Vercel → Logs) and answered with a
// plain message instead of an opaque MIDDLEWARE_INVOCATION_FAILED. Note:
// Vercel requires middleware to return a Response even to pass a request
// through (see next() in lib/portal-guard.js); returning undefined fails.
export const config = { matcher: ['/portal/:path*', '/prescribers', '/prescribers.html', '/pharmacies', '/pharmacies.html', '/lib/:path*', '/scripts/:path*', '/portal-flags.json'] };

// Server modules, build scripts and the flag file are in the repository but
// are not part of the website: answer 404 rather than serving their source.
const NOT_SERVED = /^\/(lib|scripts)\/|^\/portal-flags\.json$/;

export default async function middleware(request) {
  if (NOT_SERVED.test(new URL(request.url).pathname)) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  try {
    const { guard } = await import('./lib/portal-guard.js');
    return await guard(request);
  } catch (e) {
    const msg = (e && (e.stack || e.message)) || String(e);
    console.error('portal middleware failed:', msg);
    return new Response('The portal is temporarily unavailable. Please try again shortly.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}

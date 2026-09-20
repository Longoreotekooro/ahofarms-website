// Vercel Edge Middleware: protects everything under /portal/. The logic
// lives in lib/portal-guard.js; this wrapper loads it lazily so that a
// failure to load or run it is reported (and logged) instead of surfacing
// as an opaque MIDDLEWARE_INVOCATION_FAILED.
export const config = { matcher: ['/portal/:path*'] };

export default async function middleware(request) {
  try {
    const { guard } = await import('./lib/portal-guard.js');
    return await guard(request);
  } catch (e) {
    const msg = (e && (e.stack || e.message)) || String(e);
    console.error('portal middleware failed:', msg);
    return new Response('Portal middleware error\n\n' + msg, { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}

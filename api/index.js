// The single API function. vercel.json rewrites every /api/<group>/<name>
// request to /api/index?route=<group>/<name>, and this file dispatches to
// the handler in lib/api/<group>/<name>.js. One function keeps the
// deployment within Vercel's Hobby-plan limit of 12 serverless functions
// and gives every route a warm shared runtime; the handlers themselves are
// unchanged. Add a route by adding a line here.
const ROUTES = {
  'auth/login':           () => import('../lib/api/auth/login.js'),
  'auth/logout':          () => import('../lib/api/auth/logout.js'),
  'auth/me':              () => import('../lib/api/auth/me.js'),
  'auth/forgot':          () => import('../lib/api/auth/forgot.js'),
  'auth/reset':           () => import('../lib/api/auth/reset.js'),
  'auth/change-password': () => import('../lib/api/auth/change-password.js'),
  'access/request':       () => import('../lib/api/access/request.js'),
  'portal/home':          () => import('../lib/api/portal/home.js'),
  'consumers/connect':    () => import('../lib/api/consumers/connect.js'),
  'referral/go':          () => import('../lib/api/referral/go.js'),
  'admin/users':          () => import('../lib/api/admin/users.js'),
  'admin/requests':       () => import('../lib/api/admin/requests.js'),
  'admin/partners':       () => import('../lib/api/admin/partners.js'),
  'admin/leads':          () => import('../lib/api/admin/leads.js'),
};

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  const path = (url.searchParams.get('route') || url.pathname.replace(/^\/api\/?/, '')).replace(/\/+$/, '');
  const load = ROUTES[path];
  if (!load) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'Not found' }));
  }
  try {
    const mod = await load();
    return await mod.default(req, res);
  } catch (e) {
    console.error(`api ${path} failed:`, e);
    if (!res.headersSent) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8'); }
    res.end(JSON.stringify({ ok: false, error: 'Something went wrong on our side. Please try again.' }));
  }
}

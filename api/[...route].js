// The single API function. Every /api/<group>/<name> request lands here
// and is dispatched to its handler in lib/api/<group>/<name>.js. One
// function keeps the deployment within Vercel's Hobby-plan limit of 12
// serverless functions and gives every route a warm shared runtime; the
// handlers themselves are unchanged. Add a route by adding a line here.
const ROUTES = {
  'auth/login':           () => import('../lib/api/auth/login.js'),
  'auth/logout':          () => import('../lib/api/auth/logout.js'),
  'auth/me':              () => import('../lib/api/auth/me.js'),
  'auth/forgot':          () => import('../lib/api/auth/forgot.js'),
  'auth/reset':           () => import('../lib/api/auth/reset.js'),
  'auth/change-password': () => import('../lib/api/auth/change-password.js'),
  'access/request':       () => import('../lib/api/access/request.js'),
  'portal/home':          () => import('../lib/api/portal/home.js'),
  'directory/providers':  () => import('../lib/api/directory/providers.js'),
  'consumers/enquiry':    () => import('../lib/api/consumers/enquiry.js'),
  'admin/users':          () => import('../lib/api/admin/users.js'),
  'admin/requests':       () => import('../lib/api/admin/requests.js'),
  'admin/providers':      () => import('../lib/api/admin/providers.js'),
};

export default async function handler(req, res) {
  const path = new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '').replace(/\/+$/, '');
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

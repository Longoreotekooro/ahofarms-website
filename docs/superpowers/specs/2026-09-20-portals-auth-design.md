# Portals, sign-in and protected routes — design (2026-09-20)

CEO brief, 2026-09-20: a **Portals** item in the main navigation beside
Learn and Buy, three separate protected environments (Prescribers,
Pharmacies, Export Partners), a dedicated sign-in for each, request-access
flows, role-based permissions, protected routes, and a dashboard framework
that can be filled in progressively. This document records what was built,
where it lives and how to operate it.

## Shape

```
Portals ▾            (nav-config.js · PORTALS_NAV; "My Portal" once signed in)
├─ Consumers       → /portal/consumers/index.html       PUBLIC: access pathway, Find a Prescriber, FAQs, enquiry
├─ Prescribers     → /portal/prescriber/login.html      → /portal/prescriber/home.html
├─ Pharmacies      → /portal/pharmacy/login.html        → /portal/pharmacy/home.html
└─ Export Partners → /portal/export-partner/login.html  → /portal/export-partner/home.html
/portal/                                     public hub (portal/index.html)
/portal/<id>/request-access.html             public, portal-specific form
/portal/<id>/forgot.html · reset.html        public (reset needs the emailed token)
/portal/<id>/home.html · account.html        PROTECTED
```

| Layer | Files | Runs |
|---|---|---|
| Portal registry (ids, roles, copy, request-form fields) | `lib/portals.js` | Edge + Node |
| Session tokens (HMAC-SHA256, Web Crypto) | `lib/session.js` | Edge + Node |
| Protected routes | `middleware.js` (matcher `/portal/:path*`) | Vercel Edge |
| API entry point (one function, routes by path) | `api/[...route].js` → `lib/api/**` | Vercel Node |
| Auth API | `lib/api/auth/{login,logout,me,forgot,reset,change-password}.js` | Vercel Node |
| Request access | `lib/api/access/request.js` | Vercel Node |
| Portal content (dashboard framework) | `lib/api/portal/home.js` + `lib/portal-content.js` | Vercel Node |
| Consumer Portal: Find a Prescriber directory | `lib/providers.js` (model, regions, samples), `lib/api/directory/providers.js` (public), `lib/api/admin/providers.js` | Vercel Node |
| Consumer enquiry ("help me find a prescriber") | `lib/api/consumers/enquiry.js` (stored as a request of kind `consumer-enquiry`, emailed) | Vercel Node |
| Admin | `lib/api/admin/{users,requests,providers}.js` + `scripts/portal-admin.js` | Node |
| Accounts + requests store | `lib/users.js` (Redis REST adapter, env-JSON fallback) | Node |
| Password hashing | `lib/password.js` (scrypt, Node built-in) | Node |
| Pages | `scripts/build-portals.js` → `portal/**` | build step |
| Styling / behaviour | `assets/aho-portal.css`, `assets/aho-portal.js`; header state in `assets/aho-chrome.js` | browser |

`lib/` and `api/` are ES modules. The API is ONE Vercel function (`api/[...route].js`) because the Hobby plan allows at most 12 per deployment; handlers live in `lib/api/`. (their own `package.json` sets `"type":
"module"`); `scripts/` stays CommonJS.

## Security model

- **Session** = signed cookie `aho_portal` (HttpOnly, Secure, SameSite=Lax,
  12 h, or 30 days with "Keep me signed in"). Claims: id, email, name, role,
  org, iat/exp. Signed with `SESSION_SECRET`; anything unsigned, tampered or
  expired is rejected and cleared.
- **UI hint** = cookie `aho_portal_ui` (role only, readable by JS) so the
  header can show *My Portal · Portal home · Account · Sign out* without a
  request. It grants nothing.
- **Middleware** runs before any file under `/portal/` is served: public
  pages pass, everything else needs a valid session whose role admits that
  portal (`roleAllows`: `admin` enters all). No session → 302 to that
  portal's login with `?next=`; wrong portal → 302 to the user's own portal
  with `?notice=wrong-portal`. Protected responses carry
  `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
- **Content** only reaches the browser through `/api/portal/home`, which
  re-verifies the session and role; the dashboard HTML is an empty shell.
- **Passwords** are scrypt hashes in the store (never in the repo). Login
  errors are generic; unknown emails cost the same time as known ones;
  10 attempts / 15 min per email and 30 per IP.
- State-changing endpoints require a same-origin `Origin` header.
- Roles: `prescriber` · `pharmacy` · `export_partner` · `admin`. Account
  status: `active` · `suspended` · `pending`. Adding a portal = one entry in
  `lib/portals.js` plus a nav child in `scripts/nav-config.js`.

## Environment (Vercel → Project → Settings → Environment Variables)

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | yes | ≥32 random chars; signs sessions. Without it every portal page redirects to login and sign-in returns 503. |
| `PORTAL_ADMIN_EMAIL` + `PORTAL_ADMIN_PASSWORD_HASH` | recommended | Bootstrap administrator (hash from `node scripts/portal-admin.js hash`). |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL/TOKEN`) | for a writable store | Add the Upstash Redis integration from the Vercel Marketplace; enables approve / suspend / remove / re-role, access-request storage, password reset tokens and durable rate limits. |
| `PORTAL_USERS` | fallback | JSON array of accounts (`node scripts/portal-admin.js env-user …` prints one). Read-only. |
| `RESEND_API_KEY`, `MAIL_FROM` | optional | Sends reset links, approval links and access-request notices. Without it those links are printed to the function logs and requests still save. |
| `ACCESS_REQUEST_TO` | optional | Where access requests are emailed (default hello@ahofarms.co.nz). |
| `SITE_ORIGIN` | optional | Used by the CLI when printing links. |

Locally: put the same keys in `.env.local` (gitignored) and run the
`aho-site` preview; `scripts/dev-server.js` runs the middleware and the API
handlers itself.

## Consumer Portal (2026-09-21)

Public, no account. The order in the dropdown is public access → healthcare
professional → dispensing → international partner, each item with a one-line
description (desktop panel only). The consumer journey is: Portals →
Consumers → understand the pathway → Find a Prescriber (search by name or
city, filter by country, region, telehealth, in person) → Book consultation
or Visit clinic, leaving the Aho site. Copy avoids any suggestion that Aho
Farms prescribes, diagnoses or guarantees a prescription, and product
information stays high-level.

Directory listings live in the store; until an admin adds one, five
clearly labelled SAMPLE listings render so the page and filters can be
seen working. Manage with:

```
node scripts/portal-admin.js providers
node scripts/portal-admin.js provider-add name="…" country="New Zealand" region="Auckland" city="…" telehealth=true inPerson=true website=https://… booking=https://… phone="…" description="…"
node scripts/portal-admin.js provider-set <id> status=hidden
node scripts/portal-admin.js provider-remove <id>
```
Without the Redis store, listings are per-instance memory (or `PORTAL_PROVIDERS`
JSON in env); the Redis store makes them durable.

## Operating it

```
node scripts/portal-admin.js users                 # list accounts
node scripts/portal-admin.js add <email> <role> "<name>" "<org>"
node scripts/portal-admin.js set <email> status=suspended
node scripts/portal-admin.js requests              # pending access requests
node scripts/portal-admin.js approve <request-id>  # creates the account, prints a set-password link
```
The same operations exist as JSON endpoints for a future admin screen:
`GET/POST/PATCH/DELETE /api/admin/users`, `GET/POST /api/admin/requests`
(admin session required).

## Adding portal content

`lib/portal-content.js` holds each portal's sections and resources. Give a
resource `status: 'available'` and an `href` (a file under
`/portal/<id>/files/…`, which the middleware protects, or an API route) and
it becomes a live card. Sections carry a short `nav` label for the jump
pills. The three previous portal shells (`prescribers-portal.html` etc.)
were retired in this change; their URLs redirect to the new sign-in pages
and their content (products, CoAs, dosing, FAQs) is in git history for
migration into this framework.

## Rebuild sequence after any change

```
node scripts/build-portals.js && node scripts/propagate-nav.js && node scripts/propagate-chrome.js && node scripts/check-nav.js
```

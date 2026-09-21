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
├─ Consumers       → /portal/consumers/index.html       PUBLIC: access pathway, Get Connected (lead capture → partner referral), FAQs
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
| API entry point (one function, routes by path) | `api/index.js` (via a vercel.json rewrite) → `lib/api/**` | Vercel Node |
| Auth API | `lib/api/auth/{login,logout,me,forgot,reset,change-password}.js` | Vercel Node |
| Request access | `lib/api/access/request.js` | Vercel Node |
| Portal content (dashboard framework) | `lib/api/portal/home.js` + `lib/portal-content.js` | Vercel Node |
| Consumer lead capture + partner referral | `lib/markets.js` (countries, regions), `lib/partners.js` (partner + lead model, routing, referral codes), `lib/api/consumers/connect.js` (POST), `lib/api/referral/go.js` (GET /r/<code>, tracked hand-off) | Vercel Node |
| Partner + lead administration | `lib/api/admin/partners.js`, `lib/api/admin/leads.js`, CLI `partners`/`leads` commands | Vercel Node |
| Admin | `lib/api/admin/{users,requests,partners,leads}.js` + `scripts/portal-admin.js` | Node |
| Accounts + requests store | `lib/users.js` (Redis REST adapter, env-JSON fallback) | Node |
| Password hashing | `lib/password.js` (scrypt, Node built-in) | Node |
| Pages | `scripts/build-portals.js` → `portal/**` | build step |
| Styling / behaviour | `assets/aho-portal.css`, `assets/aho-portal.js`; header state in `assets/aho-chrome.js` | browser |

`lib/` and `api/` are ES modules. The API is ONE Vercel function (`api/index.js` (via a vercel.json rewrite)) because the Hobby plan allows at most 12 per deployment; handlers live in `lib/api/`. (their own `package.json` sets `"type":
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

## Consumer Portal (rebuilt 2026-09-21 as an Aho-controlled referral funnel)

Public, no account. Dropdown order is public access → healthcare
professional → dispensing → international partner, each item with a
one-line description (desktop panel only).

The consumer pathway is lead capture first. **No directory, partner name,
booking link or partner detail is shown before the form is submitted**, and
the partner's own URL is never sent to the browser at all.

Journey: Consumers → How access works → **Get Connected to a Prescriber**
(name, email, phone where a call is wanted, country, region/state,
preferred contact method, optional message, required referral consent,
optional marketing consent) → lead stored with consent → the approved
partner for the country is assigned (a region-specific partner wins over a
country-wide one) → the consumer's next step is shown on the page and,
when mail is configured, emailed:

- partner with a `referralUrl`: a tracked Aho link `/r/<code>` as a button
  and as a QR code (rendered client-side with the vendored MIT
  `assets/vendor/qrcode.min.js`). Opening it records the hand-off on the
  lead (first and last time, count), sets status `handed-off`, and
  redirects to the partner URL with `?ref=<code>&utm_source=ahofarms`.
- partner with only a `contactEmail`: Aho emails the partner the lead and
  tells the consumer the partner will be in touch by their chosen method.
- no partner for that market yet: status `new`, "the Aho Farms team will be
  in touch", and the admin notification says NO PARTNER.

Every lead carries a reference code, status (`new` · `referred` ·
`handed-off` · `contacted` · `closed`), timestamps and consent flags, so
the journey can be followed up and conversion measured. Lead statuses can
be updated by admins (`lead-set`). The Aho admin notification and the
partner/consumer introductions go through `lib/mail.js`.

```
node scripts/portal-admin.js partners
node scripts/portal-admin.js partner-add country="New Zealand" name="…" referralUrl=https://… contactEmail=… intro="…" [region="Auckland"]
node scripts/portal-admin.js partner-set <id> status=inactive
node scripts/portal-admin.js leads
node scripts/portal-admin.js lead-set <id> status=contacted
```
Without the Redis store, partners come from `PORTAL_PARTNERS` (JSON array in
env) and leads live in per-instance memory only, so the Redis store is
required in production for leads to be retained. No sample partners are
shipped: until a partner is added for a market, consumers in that market
get the "we'll be in touch" outcome.

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

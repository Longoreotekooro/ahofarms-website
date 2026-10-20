# Aho Farms Website

**Status:** Pre-launch review
**Hosting:** Vercel

## Local preview

Run `node scripts/dev-server.js`, then open `http://localhost:8123`. The local
server mirrors the site's extensionless public routes, including `/news` and
the article URLs under `/news/`.

## Generated pages and launch checks

After changing shared navigation, portal content or migrated news content, run:

```sh
node scripts/build-portals.js
node scripts/build-news.js
node scripts/propagate-nav.js
node scripts/propagate-chrome.js
node scripts/propagate-launch.js
node scripts/clean-internal-links.js
node scripts/build-sitemap.js
node scripts/check-nav.js
node scripts/check-launch.js
node scripts/audit-site.js
```

Vercel serves clean, extensionless URLs through `cleanUrls` in `vercel.json`.
Legacy launch redirects are version controlled in the same file.

## Temporary search exclusion

`scripts/indexing.js` records four temporarily non-indexable pages: Products,
Consumer Portal, Sun-grown and Kaitiakitanga. Their generated HTML contains
`noindex, follow`; sitemap generation omits them. Routes, navigation and
robots.txt crawl access remain available. This is an indexing request, not
access control or a guarantee of immediate removal from search results.
Run `node scripts/check-indexing.js` after the normal regeneration sequence.

## Analytics (publish container before merge)

See `docs/analytics-readiness.md` for the import JSON and release checks. Run
`node scripts/propagate-analytics.js` after editing `assets/aho-analytics.js`,
then `node scripts/check-analytics.js`, `node scripts/check-gtm.js` and
`node scripts/check-enquiry-tracking.mjs`.
This branch enables default-on public-page analytics with browser opt-out.
Publish its replacement GTM import before merging; leave Enhanced Measurement
on (Site Search off). The standard Google tag sends automatic pageviews and a
guarded email-click event. Contact/Export success events require acceptance by
the mail provider; failures retain entered fields. HubSpot visitor tracking uses
the existing account on the same public pages. Production mail routing, HubSpot
visitor-tracking account selection still need owner verification.
Local tests mock mail transport and do not prove inbox or CRM receipt. Verify
real receipt/CSP after merge. The earlier
manual page-view import is superseded and its manual tag must remain paused.

## Portals (sign-in, protected routes)

The Portals gateway lives under `/portal/`: a public Consumer Portal
(access pathway, Get Connected lead capture with country-based prescriber partner referral) and three
protected environments (Prescribers, Pharmacies, Export Partners) with
per-portal sign-in, request-access, role-based access and a dashboard
framework. Design and operations:
`docs/superpowers/specs/2026-09-20-portals-auth-design.md`.

`portal-flags.json` controls which portals the public site exposes (at launch:
Consumer Portal only). `node scripts/check-launch.js` verifies no hidden portal
is referenced anywhere public.

Before the portals work on a deployment, set `SESSION_SECRET` (and the
admin / store variables described there) in the Vercel project. Locally,
put them in `.env.local` and run the `aho-site` preview.

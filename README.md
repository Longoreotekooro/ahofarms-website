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

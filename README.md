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

## Google Tag Manager (draft installation)

Container `GTM-WJN7H2PZ` uses Google's ordinary asynchronous head loader and
the hidden noscript iframe immediately after the opening body tag.
`scripts/gtm.js` defines an explicit scope of 19 public marketing pages:
home, about, contact, cultivation, disclaimer, export-partners, news,
origins, privacy, products (public range overview only), quality,
social-impact, team, terms, tohu, whats-new, and the extraction,
kaitiakitanga and sun-grown articles. All `/portal/` pages (including the
consumer/patient journey, login and account pages), prescribers, pharmacies,
the patient-access article `news/medicinal-cannabis-nz.html`, parked pages
and 404 remain excluded. New pages require review before opting in.

The shared `propagate-chrome.js` generator preserves this scope during the
documented full rebuild (including generated news articles). To update only
the GTM blocks and check the committed static pages:

```sh
node scripts/propagate-gtm.js
node scripts/check-gtm.js
node scripts/check-nav.js
node scripts/check-launch.js
node scripts/audit-site.js
```

`vercel.json` proposes a CSP override only for the approved public paths
(root, `.html` and extensionless forms). It adds `www.googletagmanager.com`
to script, connection and frame sources, and `www.google.com` to connection
sources. Images already permit HTTPS. The inherited same-origin frame
permission is retained. Existing inline-script permission is unchanged;
no `unsafe-eval`, wildcard hosts, GA4 or HubSpot exceptions are added.
See [Google's installation instructions](https://support.google.com/tagmanager/answer/14847097)
and [CSP guidance](https://developers.google.com/tag-platform/security/guides/csp).

**Before merging:** resolve consent. `privacy.html` promises opt-in analytics
via CookieYes, but no CMP/banner or consent defaults were found in the code
or live homepage. Review the container's consent initialization and enforce
the agreed policy, including the noscript fallback; this draft does not
establish consent or add a CMP. Inventory the published container's tags
and approve only the specific additional CSP origins they need (GA4 and
HubSpot destinations are not enabled by this bootstrap-only exception).
Run GTM Preview/Tag Assistant and consent accept/decline/withdrawal checks
in a controlled preview. The corrected form trigger is still unpublished;
verify successful, failed and validation-rejected submissions later using
an approved test setup without creating real CRM contacts. The static
checks here verify installation, not delivery of analytics or conversions.

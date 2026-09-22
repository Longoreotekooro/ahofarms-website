# Aho Farms website — pre-launch audit report (2026-09-22)

Scope: every publicly reachable page (21), the generated header, footer,
dropdowns and Connect sheet, the Consumer Portal journey, forms, images,
video, fonts, metadata and the production gating of the professional
portals, at 375, 768, 1024, 1280 and 1600 px. Tooling added for repeatable
checks: `scripts/audit-site.js` (static), `scripts/check-launch.js`
(portal visibility), `scripts/check-nav.js` (links, sentinels, active state),
`scripts/build-sitemap.js`.

## 1. Summary of what was reviewed

- Pages: home, about, origins, team, logo story, land & cultivation, quality,
  products, what's new, news, contact, privacy, terms, disclaimer, 404,
  portal hub, Consumer Portal (plus the parked board / business / kaupapa /
  social-impact pages, which are noindex and unlinked).
- Components: header and desktop dropdowns, mobile accordion, footer,
  Connect sheet, buttons, cards, forms, heroes, image and video sections.
- Behaviour: horizontal overflow at four widths on every page, console
  errors, accessible names, form labels, alt text, heading order, font
  families and weights actually used, image dimensions and weight, video
  attributes, metadata, sitemap and robots, hidden-portal exposure.

## 2. Issues discovered

| Area | Finding |
|---|---|
| Metadata | No canonical URL on any page; 11 pages without Open Graph / Twitter tags; 4 without a description; no sitemap or robots; no favicon (a 404 on every page load). |
| Images | 23 images without width/height (layout shift); partner logos and one background not lazy-loaded; six photographs served at 1500–2000 px for a ≤ 680 px slot (up to 900 KB each). |
| Fonts | `font-weight: 300` (17 uses) and `700` (1 use) on the logo story page and 12 parked/legacy pages, neither weight in the Google Fonts request, so the browser synthesised them. |
| Typography | Products hero heading dropped to the h2 size on tablet while every other hero kept the h1 size. Page titles mixed "—" and "\|" separators. |
| Accessibility | Newsletter email and audience select on News had no accessible name. Minor heading-level skips on home, products, contact and news. |
| Consumer inbox | Default lead notification went only to korijames@ahofarms.com; this brief requires admin@ahofarms.com. |
| Video | Home page loop video has no poster (by design: it is hidden until the hero film finishes). Desktop thread hero film is 10 MB. |
| Code | ~690 KB of page-level CSS across 21 pages; 72 inline style attributes; 12 different max-width breakpoints in use (900 and 640 dominate). |
| Copy | "Customers" in the header vs "Consumer Portal" as the page and footer name. |
| Overflow / layout | None: no horizontal overflow on any public page at 375, 768, 1024 or 1280; no paragraph wider than 820 px; headings render in Cormorant Garamond everywhere. |

## 3. Changes implemented

- Canonical URL, favicon link, description fallback, Open Graph and Twitter
  tags stamped on every page from `site.json` (change `url` there when the
  custom domain is attached).
- `favicon.svg` built from the wordmark; `sitemap.xml` and `robots.txt`
  generated from public, indexable pages only; gated information pages now
  `noindex`.
- 23 images given width/height; partner logos and the origins background
  lazy-loaded; six photographs resized to their largest rendered size
  (3.9 MB → 2.1 MB total, invisible at 2× density).
- Font weights normalised to the loaded set (400/500/600).
- Products hero heading keeps the h1 scale on tablet.
- Page titles use one "Page | Aho Farms" format.
- Newsletter inputs on News labelled.
- Consumer lead notifications default to admin@ahofarms.com and
  korijames@ahofarms.com (`LEADS_TO` overrides).
- Earlier in the same day and verified again here: mobile accordion,
  compact Products and Portals dropdowns, four-column footer with tablet and
  phone layouts, phone-only Team hero, footer icon centring.

## 4. Recommendations not yet implemented

- **Desktop hero film (10 MB) and the 3.9 MB Matariki film**: re-encode to
  ~4–5 MB (H.264 CRF 24–26, 1920 px) and add an AV1/HEVC source. No encoder
  is available on this machine; do it where ffmpeg exists.
- **Modern image formats**: serve WebP/AVIF with `<picture>` fallbacks for
  the largest JPGs (further ~35–45% saving).
- **CSS consolidation**: the shared chrome stylesheet already owns tokens,
  buttons, fields and cards; page CSS still repeats hero, card and grid
  patterns and uses 12 breakpoints. Consolidate to 640 / 900 / 1100 in a
  post-launch pass; too broad to do safely before launch.
- **Heading order**: a few h2→h4 jumps on home, products, contact, news.
- **Terminology**: decide between "Customers" (header) and "Consumer Portal"
  (page, footer, hub). Both are approved copy, so this is flagged, not changed.
- **Apple touch icon**: add a 180 px PNG once one is produced from the mark.

## 5. Critical pre-launch issues (outside the code)

1. **Mail transport**: `RESEND_API_KEY` and `MAIL_FROM` are not set on
   Vercel, so the admin notification and consumer/partner introductions are
   logged, not sent. Set them before launch.
2. **Prescriber partners**: none are configured for New Zealand or Australia
   on production, so every enquiry returns "our team will contact you".
3. **Lead persistence**: without the Redis store, leads live in function
   memory and are lost on redeploy. Add the Upstash integration and the
   `SESSION_SECRET`.
4. **Canonical domain**: `site.json` points at the Vercel URL. Update it and
   rebuild when ahofarms.com is attached, or search engines will canonicalise
   to the Vercel host.

## 6. Performance improvements

- ~1.8 MB less image weight on the cultivation page; layout-shift risk
  removed on 23 images; favicon 404 removed from every page load; lazy
  loading on below-the-fold images; three unused font weights no longer
  synthesised. Fonts already load with `display=swap` and preconnect.

## 7–9. Mobile, tablet, desktop

- **Mobile**: accordion navigation, compact form fields with correct
  keyboards, one-column footer with paired Explore/Products, Team hero
  overlay, no overflow on any page.
- **Tablet**: brand-over-columns footer, hero headings at the h1 scale on
  every page, two-column layouts collapsing at 900 px, no cramped grids
  below 220 px columns on the key pages.
- **Desktop**: containers capped at 1280 px with even columns; compact
  dropdown panels sized to content; no paragraph exceeds a comfortable
  measure at 1600 px.

## 10. Global style improvements

- One metadata block, one favicon, one title format, one font-weight set,
  and the footer/nav now derive entirely from `scripts/nav-config.js` and
  `portal-flags.json`.

## 11. Remaining risks

- Video weight on first paint of the home page on slow connections.
- Page-level CSS duplication makes global changes slower to apply safely.
- The launch gating depends on `VERCEL_ENV=production`; preview deployments
  intentionally expose the hidden portals to the team.

## 12. Recommended next steps

1. Set the Vercel environment (mail, Redis, session secret) and add the
   NZ and AU partners; submit one live enquiry end to end.
2. Attach the custom domain and update `site.json`.
3. Re-encode the two hero films; add WebP sources.
4. Post-launch CSS consolidation pass to three breakpoints.

Rebuild line after any page or config change:
`node scripts/build-portals.js && node scripts/propagate-nav.js && node scripts/propagate-chrome.js && node scripts/propagate-launch.js && node scripts/build-sitemap.js && node scripts/check-nav.js && node scripts/check-launch.js && node scripts/audit-site.js`

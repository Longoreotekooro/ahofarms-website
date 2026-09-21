# Aho Farms Website — Prototype

**Status:** In review  
**Branch:** main  
**Preview:** Download `index.html` and open in browser, or use GitHub Pages.

## Pages Built
- [x] Homepage (`index.html`) — prototype for review

## Review Notes
Open `index.html` in any browser. No server required — self-contained file.

## Portals (sign-in, protected routes)

The Portals gateway lives under `/portal/`: a public Consumer Portal
(access pathway, Get Connected lead capture with country-based prescriber partner referral) and three
protected environments (Prescribers, Pharmacies, Export Partners) with
per-portal sign-in, request-access, role-based access and a dashboard
framework. Design and operations:
`docs/superpowers/specs/2026-09-20-portals-auth-design.md`.

Before the portals work on a deployment, set `SESSION_SECRET` (and the
admin / store variables described there) in the Vercel project. Locally,
put them in `.env.local` and run the `aho-site` preview.

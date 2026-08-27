# Aho Farms — Homepage Restructure & Two-Tier Bilingual Navigation

**Date:** 2026-08-27
**Status:** Design approved. Implementation plan pending.

## Problem

`index.html` is 2,342 lines carrying ten full-length chapters. Most of that content also exists on inner pages (`#process` vs `cultivation.html`, `#about` vs `about.html`, `#products` vs `products.html`), so it is maintained twice and has already drifted.

The navigation is a single flat row with no depth. Below 900px the CSS hides every nav link except Contact, so phones effectively have no navigation at all.

## Goals

1. Shorten the homepage by removing duplicated chapters, relocating each into the page that already owns that topic.
2. Replace the flat nav with a two-tier navigation modelled on puro.nz, with bilingual English → te reo Māori labels that swap on hover.
3. Ensure every piece of content exists in exactly one place.

## Non-goals

- No change to the v5 Matariki hero film, its `timeupdate` beat sync, autoplay retry chain, or `html.no-video` fallback.
- No visual redesign of the v3 inner pages beyond unifying nav and footer.
- No build step or framework introduced. Pages stay self-contained static HTML.

---

## 1. Navigation

### Top bar

The nav adopts puro.nz's exact three-parent shape.

| Label (EN) | Label (MI) | Caret | Destination |
|---|---|---|---|
| Learn | Ako | yes | dropdown |
| Buy | Hoko | yes | dropdown |
| Invest | Haumi | no | `investors.html` |
| Contact | Whakapā Mai | no | `contact.html` (CTA button) |

Only parents with real children carry a caret. Verified against puro.nz: `Learn` and `Buy` carry carets, `Invest` has neither caret nor children.

### Second bar

Always visible. Shows the current section's children; hovering a different parent swaps its contents.

`Invest` has no children, so the rule for what the bar shows is explicit:

- On the homepage, and on any page whose parent has no children, the bar shows **Learn's** children.
- On a page under a parent that has children, it shows that parent's children.
- Hovering a parent that has children swaps the bar to those children; hovering a childless parent leaves the bar unchanged.

The bar is never empty.

### Learn ▾

Follows the shape of Rua's `About` menu (a company-identity menu) but is populated only with content Aho actually has. Anchors are written absolute (`index.html#id`) so they resolve from inner pages, not just the homepage.

| Child | Target | Type |
|---|---|---|
| About | `about.html` | page |
| Our Origins | `origins.html` | page (new, placeholder copy) |
| Our Team | `team.html` | page (new, placeholder copy) |
| Our Board | `board.html` | page (new, placeholder copy) |
| Our Business | `business.html` | page (new, placeholder copy) |
| Our Tohu | `tohu.html` | page (new, real content — see §3) |
| Our Whenua | `index.html#land` | anchor |
| Cultivation | `cultivation.html` | page |
| Quality | `index.html#trust` | anchor |
| Our Kaupapa | `kaupapa.html` | page |
| News | `news.html` | page |

Eleven children. Puro fits seven in its second bar and Rua six in a panel, so eleven is at the upper limit of what one row holds. The bar is therefore allowed to wrap to a second row below roughly 1200px rather than scroll or truncate. If it reads as cramped in the build, the fix is to trim items, not to shrink the type below legibility.

#### Placeholder pages — no fabricated facts

`origins.html`, `team.html`, `board.html` and `business.html` ship with layout, styling, nav, footer and section scaffolding complete, and **explicitly marked placeholder blocks** where the copy goes. The CEO supplies the copy.

**Hard constraint:** no invented names, titles, bios, dates, qualifications, shareholdings or company-structure claims. These pages describe real people and a real regulated business; fabricated detail here is a legal and reputational risk, not a styling shortcut. Placeholders must be obviously placeholders — visibly marked in the rendered page, not lorem ipsum that could be mistaken for finished copy.

**Publication gate:** these four pages must not go live carrying placeholder text. Either the copy lands first, or the pages are excluded from the nav until it does.

Note `team.html` is already referenced by a dead link in the current footer, so creating it also fixes existing broken navigation.

### Buy ▾

Puro's exact two options.

| Child | Target | Type |
|---|---|---|
| Products | `products.html` | page |
| Partnerships | `index.html#portals` | anchor |

`Partnerships` points at the existing Pick Up the Thread portal section, whose four cards route onward to `prescribers.html`, `pharmacies.html`, `export-partners.html` and `investors.html`.

**Trade-off to review:** this keeps Puro parity but puts prescribers and pharmacies — a primary audience — one click deeper than they are today. If findability for prescribers matters more than matching Puro, add them directly to `Buy` as extra children.

### Invest

Single page, `investors.html`. No dropdown, matching puro.nz.

Anchors point at content that lives on the homepage; page links point at content that does not. This is the rule that keeps content single-sourced.

### Bilingual hover swap

Current markup already carries both languages per link:

```html
<a href="about.html"><span class="nav-en">About</span><span class="nav-mi">Mō Mātou</span></a>
```

Today the two are rendered stacked (English above, te reo smaller and italic below). This changes to a swap.

- Both labels occupy one CSS grid cell sized to the wider of the two, so only the text cross-fades. The bar must not reflow on hover.
- The accessible name stays fixed in English. The te reo label is presentational only, so screen readers and crawlers never see mutating text.
- Hovering a parent does two things at once: swaps its label, and populates the second bar with its children.
- Second-bar children carry the same swap on their own hover.

### Mobile

No hover exists on touch, so the swap cannot be the only way te reo appears.

- Hamburger opens a full-screen drawer.
- Parents are tap-to-expand accordions.
- Both languages render stacked, as they do in the nav today.
- This replaces the current rule that hides all nav links below 900px.

### Keyboard and motion

- Parents are focusable. Focus opens the panel; Escape closes it.
- The cross-fade respects `prefers-reduced-motion`.

---

## 2. Homepage

| Order | Section | id | Source | Change |
|---|---|---|---|---|
| — | Hero film | `#hero` | existing | unchanged |
| 01 | The Aho Advantage | `#advantage` | new | differentiators grid |
| 02 | Terroir | `#land` | `#land` | retitled, full length |
| 03 | Two Strands, One Weave | `#science` | `#science` | full length |
| 04 | Proven Quality | `#trust` | `#trust` | full length |
| 05 | Pick Up the Thread | `#portals` | `#portals` | unchanged, Tūhono Mai eyebrow retained |
| 06 | News and Updates | `#news` | `#news` | unchanged |
| 07 | Partnered With Us | `#partners` | new | placeholder logo carousel |
| — | Connect / footer | `#connect` | existing | unchanged |

Sections stay full length. The reduction comes from removing three chapters, not from condensing the survivors.

### The Aho Advantage (new)

Replaces the Meaning of Aho chapter in this slot. A differentiators grid drawn from claims already substantiated elsewhere on the site:

- Sun-grown outdoors at 39° south
- CFU count under 200, NZ standard
- Māori freehold whenua, Ngāti Pāhauwera partnership
- Independently tested by Hill Labs, IANZ accredited
- Export licence active

Every tile must correspond to a claim already made and supported on the site. No new claims are introduced here.

### Partnered With Us (new)

Reuses the existing one-line marquee mechanism (`index.html` line 507, "the proof travels like the thread itself") rather than introducing a second carousel implementation.

Ships with **placeholder tiles**. Logos are added later once cleared.

**Compliance note.** Medsafe and the Ministry of Health are regulators, not partners, and do not endorse licensees. Their logos must not appear under a "Partnered With Us" heading, and NZ Government logo and crest use carries its own permission requirements. When real logos are added, commercial and iwi partners (Ngāti Pāhauwera, Waaka whānau, Hill Labs, export partners) belong in the carousel; licence and accreditation status belongs in a separate factual text line that states it without implying endorsement.

---

## 3. Relocating cut content

Each cut chapter moves into the page that already owns its topic. Nothing is deleted.

| Cut from homepage | Moves to | Notes |
|---|---|---|
| `#process` — 10-stage cultivation stepper | `cultivation.html` | see below |
| `#products` — Our Flower | `products.html` | merge with existing content, do not duplicate |
| `#about` — Our Story / People | `about.html` | merge with existing content, do not duplicate |
| `#aho` — Meaning of Aho | `tohu.html` **(new page)** | becomes the `Our Tohu` destination in Learn |

**One new page is created: `tohu.html`.** This is not a thin page invented to fill a dropdown — it is built from the existing Meaning of Aho chapter (the weft/whakapapa framing and the five pairings), which is substantial, already written, and already styled. The Learn menu needs a destination for `Our Tohu`; this content is that destination. It is the direct analogue of Rua's own `Our Tohu` page.

### The stepper is JS-generated

`#process` renders an empty `<ol class="jlist" id="jList">`. The ten stages come from the `J_STAGES` array at `index.html` line 2102 and a render loop at line 2117.

Moving it therefore requires carrying four things to `cultivation.html`:

1. The section markup (`.cult-grid`, `.cult-left`, `.cult-photo`, the empty `<ol id="jList">`)
2. The `J_STAGES` data array
3. The render loop
4. The associated CSS rules

Merging is not a straight append. Each destination page already covers its topic, so the incoming chapter must be integrated and any resulting duplicate passages removed. A page that ends up saying the same thing twice has moved the problem rather than solved it.

---

## 4. Nav propagation across pages

The site has no build step and 20 self-contained pages (`404 about contact cultivation disclaimer export-partners export-portal index investors-portal investors kaupapa news pharmacies-portal pharmacies prescribers-portal prescribers privacy products social-impact terms`), becoming 25 once `tohu.html`, `origins.html`, `team.html`, `board.html` and `business.html` are added. A shared nav must either be duplicated into every page or injected with JavaScript.

**Decision: duplicate the markup**, and write a Node script that propagates nav changes to every page.

JS injection would make the entire navigation invisible to crawlers that do not execute scripts, which is unacceptable for a site whose discoverability matters. Duplication keeps links in raw HTML and matches how the site is already built. The script makes the duplication maintainable.

The script replaces the region between two sentinel comments in each page, so it is idempotent and safe to re-run.

### Debt fixed during propagation

The propagation pass touches every page, so the following known inconsistencies are corrected in the same pass rather than left behind:

- Three different header nav patterns (working links, `index.html#` anchors, dead `#` on prescribers and pharmacies)
- Four footer variants collapsed to one
- Footer links to non-existent `team.html` and `export.html`
- Mixed copyright years, 2025 and 2026

---

## 5. Build order

1. Nav component, proven on `index.html` only
2. Create `tohu.html` from the Meaning of Aho chapter, plus the four placeholder pages (`origins`, `team`, `board`, `business`)
3. Relocate the three remaining cut chapters into their destination pages, merging rather than appending
4. Restructure the homepage: add The Aho Advantage and Partnered With Us, retitle Terroir, remove relocated chapters
5. Propagate nav and unified footer to all pages via the script, fixing the debt above

Each stage leaves the site in a working state.

---

## 6. Testing

Verified through the local preview server (`aho-site` launch config, port 8123) and the existing `siteAudit` crawler.

| Check | Method |
|---|---|
| Every nav link resolves, no 404s | siteAudit crawler, broken-internal detection |
| Every Learn anchor exists on the homepage | grep target ids against nav hrefs |
| Nav does not reflow on hover | measure nav width before and during hover |
| Second bar populates per parent | hover each parent, read second bar contents |
| Mobile drawer opens and expands | resize to 375px, tap through |
| Keyboard: focus opens, Escape closes | key navigation through parents |
| Hero film still plays and syncs | confirm video 206 responses and beat reveals |
| No content lost in relocation | diff chapter text before and after the move |

The hero film is the highest-risk regression. It must be confirmed working after every stage that edits `index.html`.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Relocation duplicates content on destination pages | Merge and remove overlaps; diff before and after |
| Stepper breaks when moved (JS plus CSS plus markup) | Move all four parts together; verify all ten stages render |
| Hero film regression | Do not touch hero markup or JS; verify after every stage |
| Nav propagation corrupts a page | Sentinel-delimited replacement, idempotent, git diff reviewed per page |
| Partner logos create a compliance issue | Ship placeholders; regulator logos excluded from the partner carousel by design |
| Homepage still feels long | Accepted. Sections stay full length by explicit decision; the saving is three removed chapters. |

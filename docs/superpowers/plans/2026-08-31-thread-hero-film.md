# Thread Hero Film (v5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Install the new 35.6s AHO film (`AHO_full_film_v5_noR.mp4`) as the full-screen homepage hero, with typography re-timed to its beats and a "FOLLOW THE THREAD" fibre that carries the visitor out of the film and into the page.

**Architecture:** Single-file edit to `index.html` (static site, no build step) + four new encoded assets in `assets/`. The existing phase engine (`timeupdate`-driven `phN` classes), autoplay-retry ladder, sound toggle, and living-thread SVG are preserved; only timings, copy structure, the scroll cue, and a new scroll-exit fade change.

**Tech Stack:** Vanilla HTML/CSS/JS, ffmpeg for encodes.

## Global Constraints

- No build step, no frameworks, no CDN scripts — vanilla only.
- Phase reveals driven by `timeupdate`, NOT rAF (backgrounded tabs stall rAF).
- Film beats (source of truth for timings): 0–5 darkness/light-thread · 5–7 sunrise whenua · 7–15 trichomes · 15–16 droplet · 16–23 muka fibre burst · 23–31 braid over whenua · 31–35.5 baked-in title "AHO FARMS — The thread that connects."
- The film's own ending title card must not compete with HTML type: overlay copy enters early, sub/CTAs settle at ~29.5s bottom-left (title is centred); ph6 @31.3s fades the identity type before the card lands.
- Do not reintroduce "100% sun-grown"/outdoor-only absolutes; do not touch the AHO:NAV sentinel block.
- Repo has mixed line endings + `core.autocrlf=true`; never `git stash`.
- Test via repo dev server `node scripts/dev-server.js` (:8123, range requests); Browser-pane file:// strips external scripts.

---

### Task 1: Encode the four new assets

**Files:**
- Create: `assets/aho-thread-hero-desktop.mp4` (1920×822, CRF 25 slow, +faststart, AAC 112k)
- Create: `assets/aho-thread-hero-mobile.mp4` (centre crop 822×822 → 720×720, CRF 27, AAC 96k)
- Create: `assets/aho-thread-poster.jpg` (frame @35.3s, q3)
- Create: `assets/aho-thread-poster-mobile.jpg` (same frame, square crop)

**Interfaces:** Produces the four asset paths consumed verbatim by Task 2's HTML/JS references.

- [x] Encode desktop: `ffmpeg -i AHO_full_film_v5_noR.mp4 -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 112k assets/aho-thread-hero-desktop.mp4`
- [x] Encode mobile: same with `-vf "crop=822:822:549:0,scale=720:720" -crf 27 -b:a 96k`
- [x] Posters: `-ss 35.3 -frames:v 1 -q:v 3` (desktop full frame; mobile square crop)
- [x] Verify sizes (desktop 12.1MB, mobile 3.7MB) and faststart moov placement

### Task 2: Hero UI restructure + phase retiming (index.html)

**Files:** Modify `index.html` hero HTML, hero CSS, film JS

- [x] New phase map: `ph1@2.0` eyebrow · `ph2@4.4` spark + "He aho tēnei." + h1 AHO · `ph3@9` "The thread that connects." · `ph4@16.5` "Whenua. People. Knowledge. Medicine." + FOLLOW THE THREAD cue · `ph5@29.5` sub + actions · `ph6@31.3` identity type steps aside for the film's own title card
- [x] Replace h1 with serif "AHO" (descriptive text in a `.vh` span + `.hero-sub`/meta); add `.hero-line` (thread line) and `.hero-woven` (whenua words, letter-spaced small caps)
- [x] Scroll cue: text "Follow the thread", fibre lengthened to reach the viewport's bottom edge (`bottom:0`, line below text), travelling light kept
- [x] Swap all asset refs matariki→thread (poster attr, `.hero-poster` bg, JS `src`/`poster`), update `ended`/`restartWithSound`/REDUCED/no-video class lists to `ph1…ph6`
- [x] Update CSS phase selectors (incl. removing the old `ph3` 0.38-opacity special case); mobile ≤640px hides the eyebrow (opacity-only reveals reserve space and pushed it under the nav)

### Task 3: Scroll-exit fade + thread continuity into the page

**Files:** Modify `index.html` (hero CSS + one small scroll handler + `#journey` top)

- [x] CSS: `.hero-film`/`.hero-poster` and `.hero-ui` opacity keyed on `--exit` custom property
- [x] JS: passive scroll → rAF sets `--exit` = clamp(scrollY / (0.85·vh), 0, 1) on `#hero`; skipped under reduced-motion
- [x] Add `<div class="thread-inflow adv-in">` at the top of `#journey` (centred 1px gold fibre, `scaleY(0)→1` on `.in`) so the fibre visibly continues out of the film into the page
- [x] Reduced-motion: inflow shown drawn, exit fade off

### Task 4: Verify + commit

- [x] `node scripts/check-nav.js` → PASS (25 pages, 15 nav targets)
- [x] Dev server + Browser pane: film autoplays (desktop + mobile encodes), phases fire at beats, ph6 title-card handoff clean, cue reaches bottom edge, scroll fade + inflow work, no console errors
- [x] Screenshot proof at ~5s / ~11s / ~17s / ~25s / ended / post-scroll / mobile
- [x] Commit: `feat(home): new 35s thread film hero — retimed beats, follow-the-thread cue, scroll-exit fade`

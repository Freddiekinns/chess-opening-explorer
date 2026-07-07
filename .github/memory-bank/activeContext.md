# Active Context

**Date:** 2026-07-07

## Current Task: Analyse Dashboard Visual Redesign (on `claude/chess-resource-review-xmdqkl`, PR #45)

**Status:** Complete. The results view felt off-brand (flat black expanse, glary
cream loss bars, mono overload). Fixes:

- **New personal-performance tokens** `--color-perf-win/draw/loss` (+`-text`
  variants): sage / warm grey / muted brick for the player's OWN W/D/L. The
  chess-thematic result tokens stay reserved for perspective-based stats (cream
  = White won) — the dashboard had repurposed them as win=amber / loss=cream,
  making losses the brightest element on the page. Tokens added to BOTH
  `packages/web/src/styles/simplified.css` and
  `design-system/project/colors_and_type.css`; SKILL.md hard rule amended;
  preview card `design-system/project/preview/colors-perf.html` added.
- **DistributionBar**: slim rounded pills (10px/8px compact, matches detail
  WinRateBar), in-bar counts removed (tooltip `title` + `role="img"` aria-label
  carry exact counts), pct row switched mono→DM Sans tabular-nums.
- **Performance sections carded**: `--surface-raised` + `--border-default` +
  radius-lg, matching the summary cards / detail containers. On mobile there is
  no section wrapper, so each FamilyRow becomes a raised card itself (matches
  the flat-view `.mobileCard` items) — first ship missed this and mobile family
  rows sat bare on the page background.
- Warm hovers (`--surface-overlay`/`--surface-elevated` instead of white rgba),
  settings popover on `--surface-elevated` (was cold grey gradient), card
  borders tokenised, numerals de-mono'd (mono stays for move sequences),
  "Top-performing"/"Needs work" labels tinted sage/brick.

Suites: 199 frontend, lint (`--max-warnings 0`) + tsc green. Verified with
Playwright screenshots (desktop + 390px mobile, mocked analysis).

## Previous Task: Review Remediation — Perf + Existing-Feature Fixes

Complete on same branch (PR #45): review §1.1–1.3 + §2.2–2.4. Main chunk 409→189
kB, detail page 5 fetches→1 (`/api/openings/page/:fen`), seo-lookup sharded ×16,
self-hosted fonts, `/all`→410, `api/data/` single data location,
PersonalOpeningStats split, practice-line extension, accessible card links. §2.1
studies/videos and §1.4 ops automation deliberately deferred. Older history in
`archive.md`.

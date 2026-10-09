# Active Context

**Date:** 2026-10-09

## Current Task: Backlog "Now" items 1–3 — Analyse cards, copy, explorer scroll

Branch `claude/modest-lovelace-koa39l`. Each fix landed test-first.

- **Analyse highlight cards** (`personalStatsLib.ts`): the `list[0]` fallback is
  gone; with no line at 3+ games the cards give way to one explanatory line.
  `MIN_CARD_GAMES` is **3, not the audit's 10/20** — owner decision: players
  spread games thin (the 100-game Hikaru and Magnus samples have 3–4 lines with
  3+ games), so 10 would empty the cards for nearly everyone. Honesty comes from
  framing instead: cards say "won X of Y"; "Needs work" ranks by games lost
  (loss rate breaks ties) and skips lossless lines; win-rate ties go to the
  bigger sample. The list itself has no floor and sorts by "Most played".
- **Copy**: `formatCount` and `formatGamesPlayed` print billions as `B`.
  Discover's facet is **Difficulty** (`?level=` and the values unchanged), so
  "Level" means only the rating band. Move rows carry a "White wins / Black
  wins" legend and an `aria-label` with the stats. **"off-book" stays** — owner
  decision: the site is an opening book.
- **Explorer scroll**: move rows, alternatives and breadcrumbs pass
  `EXPLORER_STEP` router state (`lib/openingBook.ts`) and `ScrollToTop` leaves
  the offset alone. Verified in Chromium: 548 → 548 desktop, 858 → 858 mobile.

Left in **Now**: the popularity stats refresh (its own pipeline run).

## Previous Task: Model and effort routing for Claude Code

Merged as #167 and #168. Main session on Opus at medium effort; `scout`,
`verifier` (Haiku), `implementer`, `pipeline-reviewer`, `/docs-sync` (Sonnet);
table in `CLAUDE.md`. `AGENTS.md` cut to ~220 lines, detail moved to skills and
scoped files. Style tags tail plan (848 variations, ~11 waves): `archive.md`,
"Style tags tail — plan".

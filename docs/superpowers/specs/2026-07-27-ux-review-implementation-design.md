# Opening Book UX review — implementation design

**Date:** 2026-07-27 **Source:** `design-system/handoffs/2026-07-27-ux-review/`
(29 changes, 22 screens, 14 audit findings) **Status:** approved for planning

---

## 1. What this document is

The UX review proposes 29 changes across Discover, Opening detail and Analyse.
This spec records which of them we are building, which are already built, which
we are rejecting, and in what order — so that any agent can pick up a single
phase and deliver it without re-reading the review.

The handoff bundle is the visual reference. Open
`design-system/handoffs/2026-07-27-ux-review/Opening Book - Proposed.dc.html` in
a browser; every screen has a stable anchor id (`#detail-desktop`) that the
change log links to. `support.js` must stay alongside the HTML files.

**The mocks are references, not code.** They are single-file HTML with inline
styles. Map every value to the existing token in
`packages/web/src/styles/simplified.css` — never port a hex value.

---

## 2. The baseline correction

The review's `Opening Book - Current.dc.html` recreates production as it was
before PRs #53–#55 (the mobile opening-detail overhaul). Seven proposed changes
are already shipped. Building to the mocks literally would undo them.

| Change                                        | Actual state in `main`                                                                                                                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11 — "Opening explorer" merged card           | **Mobile already does this.** `MobileDataSurface` = sticky level pills + stats + breadcrumb + continuations, one card. Desktop is unfixed.                                                                                 |
| 12 — master games outside the filtered border | **Mobile already does this** (`MobileMasterGames` is a separate card). Desktop is _worse_ than the review states: master games render **inside** `WinRatePanel`, the same card that owns the filter they don't respond to. |
| 21 — analysing / error states "undrawn"       | Built: progress bar with step text and `processed/total`, Cancel, inline error, Enter-to-submit, platform persistence. This is a styling and copy pass.                                                                    |
| 09 — mobile search hub                        | `SearchOverlay` ships recents + repertoire + Surprise me + live results. It is only reachable from detail pages.                                                                                                           |
| 25 — chrome drift, 52px vs 56px app bar       | Mock artefact. One `TopBar` component, 60px, every page. Real gap is narrower: search renders only on `/opening/*`, and "Surprise me!" sits in the bar there.                                                              |
| 16 — board pinned while rail scrolls          | Already the desktop behaviour.                                                                                                                                                                                             |
| 15 — ECO code in mono                         | `.eco-pill` is already mono on `--surface-overlay`.                                                                                                                                                                        |
| 29 — remove dead links                        | "View repertoire", "View all" and "Edit" do not exist in production. No-op.                                                                                                                                                |

Two further corrections to the handoff README:

- **`lucide-react` is already a dependency.** The README states it is not. It is
  imported by `TopBar`, `BottomTabBar`, `SearchOverlay` and the detail page. Use
  it; do not hand-draw replacements.
- **The change log contradicts itself on "View all"** (kept at row 10, removed
  at row 29). Resolved: **removed**. There is no desktop repertoire page.

---

## 3. Decisions taken

| Question                                  | Decision                                                               | Rationale                                                                                                                                                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faceted filter bar data                   | **Build a new browse endpoint**                                        | Cannot be done client-side. `search-index` lacks complexity, style tags and win rates; `popular-by-eco` supports complexity and category only; facet counts need a full-corpus aggregate.                              |
| Games-count gear (change 17)              | **Move to the dashboard, do not delete**                               | The control works and persists today. "Almost nobody approaches the cap" is asserted, not measured, and we have no analytics to check it. The change log explicitly permits relocation.                                |
| Practice CTA weight (change 24 vs README) | **Primary, filled orange**                                             | Practice mode is fully implemented in production — colour choice, hints, progress counter, line extension. It can carry primary weight.                                                                                |
| Mobile tab bar (change 06)                | **Three tabs: Discover · Repertoire · Analyse**                        | Once persistent app-bar search ships, a Search tab is a nav item that does not navigate. Three tabs give bigger targets and no redundancy.                                                                             |
| Desktop explorer card structure           | **Full `ExplorerCard` shell — re-parenting, not redesign**             | Supersedes the 2026-07-13 right-column spec on one point (see §3.1). July's styling survives intact; only the block parentage changes. Also extracts a shared `MasterGamesCard`, retiring the duplicate masters fetch. |
| Sample report (change 19)                 | **Pre-baked cached fixtures**                                          | A live third-party call on a landing screen means rate-limit exposure, slow first paint and a support burden. Fixtures are instant and safe.                                                                           |
| Delivery                                  | **Integration branch; phases are PRs into it; one merge to main**      | Sequential merges to `main` mid-programme have broken things before. Each phase PR still gets its own Vercel preview, so review stays incremental — but `main` is touched once, at the end. See §9.                    |
| Mobile tab bar height                     | **Keep 60px** (`--bottom-tab-bar-height`)                              | The mocks say 64px. The token is already correct and consistent; `Footer` and page padding offset against it. 4px of churn across three files for no perceptible gain.                                                 |
| Repertoire persistence                    | **Accept `localStorage`, record the risk**                             | Saved openings do not sync across devices and vanish with site data. Revisit if sign-in lands.                                                                                                                         |
| Master games position, mobile detail      | ~~Move below Learning resources~~ → **reversed 2026-07-30, see below** | Original rationale: browse content should not outrank learning content, and it makes both breakpoints agree. The second half was simply false, and the first was the wrong axis. See §3.2.                             |

### 3.1 Superseding the 2026-07-13 right-column spec

`docs/superpowers/specs/2026-07-13-opening-detail-right-column-redesign-design.md`
decided to merge `LevelLens` **into** `WinRatePanel` and to **keep master games
inside** that card. This spec overrides that one decision. Nothing else in the
July spec changes.

The reason is a scope defect, not a difference of taste. On desktop today:

- the level pills live inside `WinRatePanel`;
- `WinRatePanel` also contains master games, which **ignore** the level filter;
- the pills silently drive `OpeningNavigator`, a **separate card outside their
  border**.

The filter therefore under-reaches inside its own card and over-reaches into one
it does not visually own. There is no way to learn what it governs by using it.
July's spec was a styling consolidation and never examined this.

What survives from July, unchanged: the stat pair (`Total games` /
`Average Elo`), the win bar and legend, the two-line stacked move rows, the
Overview card restyle, and the `averageRating` wiring in
`lib/lichessExplorer.ts`. **Phase 4 is re-parenting, not restyling.**

A rejected cheaper option, recorded so it is not re-proposed: move master games
out and caption the navigator with the active band, leaving two cards. That
fixes both lies but states the filter's reach in copy rather than showing it as
a border — and it forgoes the shared-component win below.

Bonus in scope: `WinRatePanel` and `MobileMasterGames` each fetch the masters
band independently today. Extracting one `MasterGamesCard` serves both
breakpoints and retires the duplicate fetch.

### 3.2 Reversing the mobile master-games position (2026-07-30)

The table above sent master games to the **bottom** of the mobile stack. Phase 4
implemented that faithfully — below videos, studies and even the search pills —
and the code carried a comment repeating the spec's second reason. Both reasons
were wrong.

"Makes both breakpoints agree on block order" is false as written. Desktop puts
`MasterGamesCard` in the right rail directly beneath `ExplorerCard`, and
Learning resources is a full-width section _below the whole grid_. In reading
order, desktop has always had master games **before** the resources. Sending
mobile to the bottom made the breakpoints disagree, not agree. The design bundle
said so too:
`design-system/project/preview/components-opening-detail-mobile.html` and the
original 2a exploration both draw it above Common plans.

"Browse content should not outrank learning content" ranks the wrong axis. The
stack is not a merit order, it is a distance order: Overview and the explorer
surface describe the position, and everything after them leads away from the
page — how to play it, then go watch someone explain it, then go search for
yourself. Master games ("who played this, and how did it go") is more of the
first kind. It also costs one collapsed row, so placing it above Common plans
barely moves anything down, whereas the reverse strands a data row behind a
screen of scrolling.

New order, live since 2026-07-30: **Overview · explorer surface · master games ·
common plans · videos and studies · search pills.** Guarded by
`packages/web/src/pages/__tests__/mobile-stack-order.test.tsx`, which asserts
document order across every block — reordering a JSX stack is a one-line change
no other test notices. Do not "restore" the table's original decision.

Accepted cost: the card's `IntersectionObserver` gate now trips after a swipe or
two instead of a full scroll, so the masters band is fetched on more sessions.
The route's 7-day CDN cache absorbs it and it 403s crawlers. No reserved height
— plenty of deep positions have no master games at all, and a placeholder that
later vanished would shift content _upward_ under a finger.

### 3.3 One search row for all three surfaces (2026-07-30)

Phases 1 and 5 added a pre-typing hub to each search surface and kept Surprise
me alive through typing, but each surface built its own rows. By the end there
were **three** implementations of a search result row and **two** of the hub
row, and the two states were on different type scales — the hub on `--text-*`
(13px medium name, ECO as inline mono text in a meta line), the hero's results
on the `--font-size-*` legacy aliases (16px semibold name, ECO as a bordered
pill, moves on their own line, a 135° gradient and a half-pixel lift on hover),
and the top bar on a third mix again. Typing a second character therefore
changed an opening's size, weight, layout and hover behaviour, and Surprise me
went from a muted two-line row to brand orange semibold with its hint flung to
the right margin — louder than the twenty real answers above it, which its own
source comment said it must not be.

None of that was a decision. It is what happens when four surfaces are built in
four phases and the row is never named as a component.

`components/shared/SearchRow.tsx` is now that component — `SearchRow` and
`SurpriseRow`, styled by `SearchRow.module.css`, on the `--text-*` scale. The
hero dropdown, the top-bar dropdown and the mobile overlay all draw it, before
and after typing. `formatMovesPreview` moved to `lib/searchQuery` so the preview
cannot differ between surfaces either — two of them used a blunt first-six-plies
preview, which renders every Sicilian variation as "1. e4 c5".

**No row leads with an icon.** The first cut kept the hub's clock and star and
gave results none, which is defensible in the abstract and wrong in fact: it put
the opening's name at 39px before you typed and 13px after. A 26px jump in the
name's left edge is the most visible drift on the surface, and it was being
caused by the marker meant to say nothing had changed. The clock and the star
also only repeated the section heading directly above them, once per row. The
mobile chevron went the same way — it was on mobile _results_ and not on mobile
_hub_ rows, so it was drift wearing an affordance's clothes.

Surprise me carries one mark and one only: an orange label. It is the single row
that is not an opening — every other row goes to a named position, this one
takes an action — and orange text is already how the app says "action"
(`.cancelBtn`, `.back-link`, `.reset-filter-btn`) against white for a
destination. Colour only: same size, same weight, same box, same hover, muted
hint. The results list used to make it orange _and_ heavier _and_ filled on
hover with the hint flung right, which put the escape hatch above the twenty
real answers it sits under. Its kind differs from the rows around it; its rank
does not.

It has no icon, and the glyph search is why. Sparkles is the industry's AI mark;
Shuffle and dice name chance rather than a destination, and shuffle reads as a
mode you switch on; a gift or an opening box reads as a reward, and mystery-box
imagery borrows a loot-box association this has no business borrowing. The
payoff is a chess opening chosen at random, a smaller promise than any of those
pictures makes. The hint line says it in words.

**Mobile's hero hands off to the overlay.** Below 767px the landing page ran two
search models on one screen: the top bar's magnifier opened the full-screen
`SearchOverlay` while the hero opened an inline dropdown that a real on-screen
keyboard covers. The hero field is now `readOnly` there and opens the same
overlay, so there is one search surface per screen. Desktop is unchanged.

Three more consequences worth recording, because each reverses something
earlier:

- **The top-bar dropdown is no longer pinned to its field.** Phase 1 fixed the
  field at 240px (unchanged), and the dropdown inherited that width, which is
  why Surprise me dropped its visible hint there and kept it only in a `title`
  and an `aria-label`. That is invisible to a sighted user arrowing through the
  list. The panel now sizes to its contents up to 380px, so the row explains
  itself on every surface and the exception is gone.
- **The hero hub dropdown had no interior padding at all.** "Recent" sat one
  pixel below the top border and read as clipped; every row touched the sides.
  The mobile overlay never showed the fault because its scrolling body supplies
  the inset.
- **The results list was capped at 280px** against rows of 71px — under four of
  twenty visible. Now `min(60vh, 480px)`.

Guarded by `components/shared/__tests__/search-row-parity.test.tsx`, which
compares a hub row against a results row and fails if they diverge. Canonical
reference: `design-system/project/preview/components-search-row.html`; the hub
and results cards own their panels and explicitly do not restyle the row.

---

## 4. Additions not in the review

1. **Snapshot-fallback labelling on the explorer card.** When
   `LICHESS_EXPLORER_TOKEN` is absent the `/api/explorer` proxy 503s and the
   panel falls back to bundled snapshot stats. A card headed "Opening explorer /
   Lichess · all ratings" must not claim live data while serving the fallback.
   The mocks draw only the happy path.
2. **`aria-pressed` on `StarButton`.** The review asks for it and it is
   genuinely missing. The anchor-navigation guard (`preventDefault` +
   `stopPropagation`) is already correct.
3. **`aria-live` on the filter result count.** Otherwise the new filter bar is
   silent to screen readers.
4. **Filter state in URL search params, not component state.** The only way
   "filter state survives back-navigation" works, and it keeps grid cards as
   real crawlable `<a>` links across 12,000+ indexed pages.
5. **Shared `ResultBar` component.** The win/draw/loss bar markup is currently
   duplicated across `OpeningCard`'s two variants and elsewhere. Change 05
   touches every copy, so extract it rather than edit four.

---

## 5. Phases

Each phase is one PR, independently shippable and revertable.

### Phase 0 — Systemic pass

No behaviour change. Lands first because every later phase inherits it.

**Button spec.** Primary = filled `--color-brand-orange`, text
`--color-text-inverse`, `--radius-md`. Secondary = transparent + neutral border.
Tertiary = neutral surface, neutral text, no orange.

- `.load-more-btn` (`simplified.css:2446`) — currently orange text, orange
  border, `999px` radius. Becomes tertiary.
- Analyse CTA — pill radius to `--radius-md`. Pill shape survives only on the
  platform toggle.
- Dashboard mobile CTA — `#fff` to `--color-text-inverse`.
- Practice — to primary.

**Naming.** "My repertoire" → "Your repertoire" (headings), "Repertoire" (tab
and app bar), "Added to your repertoire" (toast).

**Copy.** "Analyse Your Games" → "Analyse your games" — both the `h1`
(`PersonalOpeningStats.tsx:254`) and the SEO title (`AnalyseGamesPage.tsx:11`).
"Search by pasting PGN" → "Paste a game". Sentence case sweep.

**Decoration.** Remove the orange gradient rule under mobile section headings —
the last use of orange as decoration rather than action.

**Result bars.** Extract `ResultBar`; labels become "White 31% · Draw 39% ·
Black 30%". Result colours stay `--color-result-white` / `-draw` / `-black`.

**Accessibility.** `aria-pressed` on `StarButton`; orange focus outline
(`outline: 2px solid var(--color-brand-orange); outline-offset: 2px`) audited
across controls; mobile hit targets ≥44px.

**Lockstep.** Update `design-system/project/colors_and_type.css` and any
affected preview card in the same PR.

_Checkpoint:_ no functional change. Full test suite green, `npm run build`
clean, Playwright screenshots at 1360 and 390 for Discover, detail and Analyse
showing only the intended visual deltas.

---

### Phase 1 — Discover: close the loop

The change that justifies the review. Today the page promotes building a
repertoire and provides no way to do it.

- **Star on every card.** `OpeningCard` already accepts `showStar` / `isStarred`
  / `onStarClick` and nothing passes them. Wire them in `PopularOpeningsGrid`
  from `useRepertoire`.
- **Toast with Undo.** Extract the detail page's toast into a shared component;
  add Undo. Required because the star is now a single tap on a scrolling list
  where mis-taps are likely.
- **First run leads with content.** `RepertoireSection`'s empty state (dashed
  box, icon, two lines) becomes a one-line prompt: "Star openings to build your
  repertoire." No link — there is nothing to link to when empty.
- **Persistent search.** `TopBar` renders its search field on every page, not
  only `/opening/*`. Field width 240px. Remove "Surprise me!" from the bar.
- **Hero.** Search is the only prominent element. "Surprise me · Paste a game"
  become quiet links beneath it, Surprise first.
- **Mobile tab bar.** Discover · Repertoire · Analyse. New `/repertoire` route
  with populated and empty states. Count badge on the tab.
- **Search everywhere on mobile.** The app-bar search icon opens the existing
  `SearchOverlay` on all pages.
- **Desktop search hub.** The landing `SearchBar`'s focused dropdown gains
  Recent (`lib/recentOpenings`) + Your repertoire + Surprise me.

_Checkpoint:_ a user can complete find → save → revisit entirely from Discover,
on both breakpoints, without opening a detail page.

---

### Phase 2 — Browse API

No UI change. Lands before the filter bar so the bar is never built on numbers
that do not reconcile.

`GET /api/openings/browse` with `level`, `style`, `family`, `sort`, `page`,
returning:

```
{ items: [...], total: <filtered total>, facets: { level: [...], style: [...], family: [...] } }
```

Facet counts are computed server-side over the full corpus. The rule, stated
once: **the count is always the filtered total; the Load more button is always
the difference.**

Requirements:

- A `Cache-Control` entry in `vercel.json` — mandatory for every new route
  (CLAUDE.md). Crawlers index 12,000+ pages and amplify unbounded payloads into
  origin-transfer bills.
- Page size capped; no unbounded response.
- Backend tests (Jest) including an assertion that
  `total === shown + remaining`.

_Checkpoint:_ the endpoint's arithmetic is provably true under test. This is the
bug the review found in the mock and which production also has — today the
category counts come from the landing page's popular list while the grid
contents come from a separate `popular-by-eco` fetch, so they cannot agree.

---

### Phase 3 — Faceted filter bar

Replaces two unlabelled pill rows (`ComplexityFilters` + `CategoryFilter`) that
read as one row of ten, with raw ECO letters as jargon.

- **Desktop:** four facet buttons each showing its current value — Level · Style
  · Family · Sort — plus a result count and Clear.
- **Mobile:** one Filters control with an active count, opening a sheet per
  facet. The Family sheet has a search field and groups by first move.
- **Family replaces ECO categories.** `family_id` is already on the full
  search-index and `/api/families` already serves display names.
- State lives in URL search params. Cards stay real `<a>` links.
- `aria-live` on the count.
- "Load more (N remaining)" with an honest N. The button already renders on both
  breakpoints — change 27's "mobile gained the Load more it was missing" is a
  mock artefact. Only the arithmetic is wrong today.

_Checkpoint:_ counts reconcile on screen; navigating to a detail page and back
restores the active facets; cards remain crawlable links.

---

### Phase 4 — Opening detail (desktop)

Mobile gets copy changes plus one structural change: **master games moves below
Learning resources**, matching the proposed mobile screen and the new desktop
order. `MobileMasterGames` is replaced by the shared `MasterGamesCard`.

- **New `ExplorerCard` shell.** Raised header band carrying the title "Opening
  explorer", the source line, and the `LevelLens` pills. Body: stats,
  breadcrumb, Next moves, Alternatives. Everything the filter governs sits
  inside that border; nothing outside it moves.
- **`WinRatePanel` gives up its pills and its master-games block.**
- **Master games become their own rail card**, titled "Master games" with a
  "2,400+ Elo" source line and an "All 47 master games" reveal. It is the one
  list the level filter does not apply to.
- **Labelled reveals.** "Show 4 more moves", "Show 3 more videos", "All 47
  master games". Five identical grey "Show more" buttons told the user nothing.
- **Practice** to primary filled, under the board.
- **Level echoes in sub-labels** — "Most popular at 1400–1800", "Games ·
  intermediate" — on both breakpoints, because the filter header scrolls out of
  view on a tall mobile card.
- **Snapshot-fallback labelling** (addition 1 above).
- Rename "opening book" to "Opening explorer" throughout, matching Lichess.

_Checkpoint:_ the sticky board still releases when the rail ends. Watch the
`overflow: clip` rule — `overflow: hidden` on a card containing a sticky child
makes that card the containing block and breaks the stick.

_Degradation:_ each block is independent. An empty block is **omitted, not shown
empty**, and the remaining blocks close up. Do not add empty-state cards for
missing sections — most of the 12,377 openings are sparse, so that is the common
case, not an edge case.

---

### Phase 5 — Analyse

- **One header.** The duplicate "Ready to analyse your openings?" block goes;
  the hero carries the payoff subtitle: "See which openings you actually play,
  and how they score — from your recent rated games."
- **Scope and privacy line.** "Reads your public rated games — rapid, blitz &
  classical. Bullet excluded. Nothing is stored."
- **Gear relocated** from the blank state to the dashboard header. `limit` stays
  in persisted form state.
- **Sample report.** "See a sample report — Magnus · Hikaru", served from
  committed fixtures. Needs a regeneration script and an "as of \<date\>" line,
  since the fixtures are a snapshot of real games and will go stale.
- **Accessibility.** Platform toggle becomes a radio group (currently two
  buttons). Real `<label>` on the username input, not placeholder-only.
- **Dashboard honesty.** "Career Totals / Overall performance" → "Your record"
  under a "This analysis" eyebrow. The old label claimed a lifetime record for
  numbers describing only the games in this run — the clearest factual error on
  the screen. Wins tinted sage, losses brick, draws neutral — "sage" and "brick"
  are the mock's words, not existing tokens. Resolve them against the
  result-colour scale (`--color-result-white` / `-draw` / `-black`) or add named
  tokens in the same PR; never introduce raw hex values.
- **"GP" → "Games"** in the desktop column header, matching mobile.
- **Transient states restyled** to spec: Analyse becomes Cancel with a spinner,
  inputs dim, progress bar shows step and game count; the error is a quiet
  inline message on a neutral surface, username retained, button back to
  Analyse.

---

## 6. Verification, every phase

- `npm run test:frontend` (Vitest), `npm test` (Jest, with
  `--testPathIgnorePatterns='\.worktrees'`), `npm run build`, `npm run format`.
- Playwright screenshots at 1360 and 390 for every touched screen — the method
  used to verify #53–#55.
- Trust CI over local `npm run format:check`: with `core.autocrlf=true` the
  local working tree is CRLF and `.prettierrc` sets `endOfLine: lf`, so dozens
  of files false-fail locally while being clean on CI.
- Design-system bundle updated in the same PR as any token, component or visual
  surface change.
- `activeContext.md` (<50 lines) and `progress.md` (<100 lines) updated; detail
  to `archive.md`.
- **Merge `main` into the integration branch** at the start of each phase. Cheap
  when there is nothing to take; catches drift early rather than at the final
  merge.

---

## 7. Non-goals

Stated explicitly so no agent invents them: tablet breakpoints, the
practice-mode flow itself, sign-in, a desktop repertoire page, manual repertoire
reordering, empty-state cards for sparse openings, and the desktop
typed-and-submitted search results state.

There is **no separate repertoire page on desktop** — the row on Discover _is_
the repertoire. Mobile keeps its Repertoire tab. Sort is fixed at most recently
saved first. Revisit both if saved counts grow past what one row can hold.

---

## 8. Risks

| Risk                                                                                                                            | Mitigation                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Repertoire is `localStorage` only — no sync, cleared with site data — and Phase 1 builds a tab, a badge and an Undo toast on it | Accepted. Recorded here. Revisit if sign-in lands.                                                                      |
| Sample-report fixtures go stale                                                                                                 | Regeneration script + visible "as of \<date\>".                                                                         |
| Browse endpoint payload size amplified by crawlers                                                                              | Capped page size + `Cache-Control` in `vercel.json`.                                                                    |
| Phase 4 rail grows taller and breaks the sticky board                                                                           | Explicit checkpoint; `overflow: clip` not `hidden` on any card with a sticky child.                                     |
| Phase 3 filter refactor silently drops crawlable card links                                                                     | Cards stay `<a>`; URL-param state; SEO check in the phase checkpoint.                                                   |
| Desktop and mobile explorer cards diverge (separate shells, shared master-games card)                                           | Both must show the same labels, the same block order and the same filter scope. Full convergence logged as a follow-up. |
| Integration branch drifts from `main`                                                                                           | `main` merged into the branch at the start of every phase (§6).                                                         |

---

## 9. Delivery

One integration branch. Phases are PRs **into that branch**, not into `main`.

```
main
 └─ feat/ux-review                 ← one PR to main, at the end
     ├─ ux/phase-0-systemic        ← PR into feat/ux-review (own preview)
     ├─ ux/phase-1-discover        ← PR into feat/ux-review (own preview)
     ├─ ux/phase-2-browse-api
     ├─ ux/phase-3-filter-bar
     ├─ ux/phase-4-detail-desktop
     └─ ux/phase-5-analyse
```

Why this shape:

- **`main` is touched once.** Sequential merges to `main` mid-programme have
  broken production before; this removes the opportunity.
- **Every phase still gets its own Vercel preview URL**, so review stays
  incremental and diffs stay readable. Vercel builds a preview per branch, so
  the integration branch also has one showing cumulative state.
- **A bad phase is revertable inside the branch** without touching production.

Rules:

- Never merge a phase branch into `main` directly.
- Merge `main` into `feat/ux-review` at the start of each phase, then the phase
  branch off that (§6).
- The final `feat/ux-review` → `main` PR is the production gate: full suite,
  screenshots at both breakpoints for all touched screens, and a manual pass
  over the integration preview.
- Phases 0–1 are independently valuable and low-risk. If the programme stalls,
  the branch can be cut to `main` after Phase 1 rather than abandoned.

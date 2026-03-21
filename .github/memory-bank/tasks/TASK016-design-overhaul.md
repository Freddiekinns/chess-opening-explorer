# TASK016: Design overhaul — sidebar navigation and page refresh

**Status:** Pending **Added:** 2026-03-21

## 1. Problem

The current site works but feels like a functional prototype rather than a
polished product. The top-level navigation is a two-tab toggle (Discover /
Analyse My Games) that doesn't scale, the layout is centred and vertically
stacked, and the pages lack visual hierarchy. A design overhaul should make the
site feel modern and intentional while preserving the information density and
functional quality that already works.

## 2. Design principles

These apply across every page:

- **Sentence case everywhere.** No all-caps headings, no uppercase section
  labels, no shouted typography. "Sicilian defense" not "SICILIAN DEFENSE".
- **No stock photography.** The interactive chessboard is the product's core
  visual. Never place a stock photo of a chess board alongside the real board.
  Use the actual board position, abstract patterns, or colour coding instead.
- **Keep real data.** All designs must use the real product name ("Opening
  Book"), real feature scope, and real data shapes. No fictional branding, no
  aspirational features that don't exist yet.
- **Information density over decoration.** The current opening cards (ECO code,
  game count, W/D/L bar, difficulty badge) are more useful than pretty cards
  with a photo and a win rate. Polish the presentation without losing data.
- **Dark theme, orange accent.** Keep the existing `#121212` / `#1e1e1e` /
  `#e85d04` palette. It works.

## 3. Structural change: top bar navigation

### What changes

Replace the top-level `LandingHeader` (centred pill toggle) and `GlobalHeader`
(sticky top bar on detail page) with a single persistent top navigation bar that
appears on every page. The left sidebar built in chunks 1–3 is replaced by this
top bar (see decision log, 2026-03-21).

### Top bar specification

- **Height:** 56px, sticky (`position: sticky; top: 0`)
- **Background:** `--color-bg-surface` with
  `border-bottom: 1px solid var(--color-border)`
- **Logo:** "Opening Book" wordmark on the left, linking to `/`. Plain text,
  system font, semi-bold.
- **Nav items:** Discover (compass icon + label), Analyse (bar-chart icon +
  label) — centre or right of bar. Active state: orange text colour + underline
  or background highlight.
- **Search:** Not in the top bar on Discover or Analyse pages. The hero search
  on Discover is the primary search UI — duplicating it into the nav would
  create two search bars on the same page. On the detail page, search moves into
  a `ContentHeader` bar below the top nav (see chunk 5). This keeps search
  contextual: prominent on Discover (hero), absent on Analyse (irrelevant), and
  available on Detail (for jumping between openings).
- **Surprise me:** Not in the top bar. Stays in the hero on Discover and in the
  ContentHeader on the detail page.

### Mobile bottom tab bar (preserved from sidebar work)

- Fixed to viewport bottom, 56px tall
- Two items: Discover, Analyse — matching the top bar
- Active state: filled icon + orange label colour
- Below 640px the top bar hides nav items (logo only) and the bottom tabs handle
  navigation
- Already built and working (`BottomTabBar.tsx`)

### Key files

- `packages/web/src/App.tsx` — replace `<Sidebar />` with `<TopBar />`
- `packages/web/src/components/layout/TopBar.tsx` — new (replaces Sidebar.tsx)
- `packages/web/src/components/layout/TopBar.module.css` — new
- `packages/web/src/components/layout/BottomTabBar.tsx` — keep as-is
- `packages/web/src/components/layout/BottomTabBar.module.css` — keep as-is
- `packages/web/src/components/layout/Sidebar.tsx` — remove
- `packages/web/src/components/layout/Sidebar.module.css` — remove
- `packages/web/src/styles/simplified.css` — remove `margin-left` approach, page
  content flows naturally below sticky top bar

## 4. Repertoire stays on Discover

### Decision

The repertoire section stays inline on the Discover page. It does not get its
own navigation item.

### Rationale

- **Scale of content.** The repertoire is localStorage-based with no account
  system. A typical user saves 3–8 openings. That's a horizontal scroller or a
  short list — not enough content to justify an entire page.
- **Navigation bloat.** Adding a third nav item ("Library") when it would
  usually show a near-empty page degrades the experience for new users and makes
  the app look hollow.
- **Discovery flow.** The repertoire sitting on the Discover page reinforces the
  loop: browse → save → see your saves → browse more. Hiding it behind a
  separate nav tab breaks that proximity.
- **Future upgrade path.** If/when account-based repertoires, colour grouping
  (White/Black), or mastery tracking are added, the repertoire can graduate to
  its own page. The sidebar structure supports adding a third item later without
  a redesign.

### What to improve

- Lift the repertoire section higher on the page — immediately after the search
  bar, before "Browse chess openings"
- When the user has saved openings, give the section a subtle background surface
  (`--color-bg-surface`) to distinguish it from the browse area
- Keep the horizontal scroller, compact cards, star button, empty state

## 5. Page-by-page design direction

### 5a. Discover page (`/`)

**Current state:** Centred hero with title, search bar, PGN link, "Surprise me"
button, then repertoire section, then a 3-column card grid with level/category
filter chips, then feedback footer.

**What changes:**

- **Layout stays centred.** The sidebar is a narrow navigation rail — the
  content area centres within its own bounds. Hero text and search bar remain
  centred (reverted after visual review — left-align left too much dead space).
- **Hero section:** Keep "Opening Book" as h1 (sentence case), keep the
  subtitle, keep the search bar. "Surprise me" button and PGN search link stay.
  Remove the `LandingHeader` tab toggle (replaced by sidebar).
- **Repertoire section:** No changes beyond the improvements in section 4.
- **Browse section heading:** "Browse chess openings" in sentence case. Subtitle
  "Filter by skill level and explore openings by type" stays.
- **Filter chips:** Keep the horizontal pill toggles for level (All levels /
  Beginner / Intermediate / Advanced) and category (All openings / Irregular /
  Semi-open / Open / Closed / Indian). These are compact and work well. Do not
  replace with radio buttons or vertical lists.
- **Opening cards:** Keep the current format — card with name, ECO badge, games
  played count, W/D/L segmented bar, first moves, difficulty badge. Polish: add
  a subtle hover lift (translateY -2px, shadow increase), improve spacing
  between card elements, ensure the W/D/L bar has consistent height across
  cards. Do not add stock photography to cards.
- **"Load more" button:** Keep at the bottom of the grid.
- **Feedback section:** Keep.

**What not to change:** The content and copy stay the same. No "Master the first
move" hero copy, no "Midnight Gambit" branding, no "Engine Insights" widget.

### 5b. Opening detail page (`/opening/:fen`)

**Current state:** Sticky `GlobalHeader` with search. Opening name as h1 with
star, tag pills (ECO, variation, complexity, style tags). Two-column layout:
left column has the interactive chessboard with move navigation (<<, <, >, >>,
Practice) and FEN display (copy/analyse). Right column has opening moves
display, win rate stats bar, and tabs (Overview / Plans / Studies with count).

**What changes:**

- **Header:** Remove `GlobalHeader`. Add a `ContentHeader` bar above the page
  content with: back arrow (→ Discover), opening name as breadcrumb, search bar
  (right-aligned). This is thinner than the current header.
- **Title area:** The opening name stays as h1 with star button. Tag pills stay.
  Consider grouping the ECO code and line type ("Variation", "Mainline") as a
  compact badge cluster, with style tags (Flexible, Strategic, Solid) as a
  separate row beneath.
- **Left column — chessboard:** No changes to the interactive board. Keep move
  navigation controls, FEN display with copy/analyse buttons, and the related
  openings teaser below. The board is the centrepiece — keep it large.
- **Right column — drop tabs, use hybrid layout:** The current tabs (Overview /
  Plans / Studies / Videos) hide complementary content behind clicks. The
  overview is a single paragraph, plans is a short strategy list — not enough
  content to justify tab UI. And 2 of 4 tabs (Studies, Videos) conditionally
  disappear when there's no data, often leaving just two tabs for a paragraph
  and a list.

  Split the content into two zones: knowledge content stays in the right column
  next to the board, media resources break out to full width below.

  **Right column (next to board):**

  ```
  Opening moves (clickable notation)     ← stays as-is
  Win rate bar                           ← stays as-is
  ─────────────────────────────────────
  Description                            ← was "Overview" tab content
  ─────────────────────────────────────
  Plans (white / black strategy cards)   ← was "Plans" tab; use the existing
                                           CommonPlans component, which already
                                           splits by side
  ```

  **Full-width sections below the two-column area:**

  ```
  ─────────────────────────────────────────────────────────
  Studies (3)                              horizontal scroll →
  ─────────────────────────────────────────────────────────
  Videos (4)                               horizontal scroll →
  ```

  Description and plans belong next to the board — they're about the position.
  Videos and studies are "click away to learn more" resources that benefit from
  full-width horizontal scrollers with properly sized thumbnails. Only render
  each section when data exists.

  Each section heading uses sentence case, 18px semi-bold, with subtle dividers
  (`1px border-top` in `--color-bg-alt`). Remove `activeTab` state, `TAB_TYPES`
  constant, and all tab show/hide logic.

  The opening tree (TASK015) sits as a collapsible panel in the left column
  below the board, or below the two-column area — placement TBD based on TASK015
  progress.

- **Mobile:** The two-column layout stacks vertically (board on top, full
  width). This already works — keep it. The stacked sections flow naturally in a
  single column. The back button becomes part of the content header, not a
  floating button.

**What not to change:** The interactive chessboard, move navigation, FEN
display, related openings. Do not replace the board with a stock photo. Do not
add "Academy resources" or "Main line theory table" as new concepts.

### 5c. Analyse page (`/analyse`)

**Current state:** `LandingHeader` at top. Hero with "Analyse your games" title
and subtitle. Platform selector (Chess.com/Lichess), username input, game count
control, analyse button. Results show two summary cards (white win rate, black
win rate), top-performing and needs-work callouts, and two side-by-side lists of
openings as white/black with pill badges (W/D/L counts).

**What changes:**

- **Header:** Remove `LandingHeader` (replaced by sidebar). The hero section
  stays but left-aligns.
- **Input bar:** Keep the platform/username/games/analyse layout. Polish the
  input styling to match the search bar on Discover (consistent border radius,
  focus states).
- **Summary stats:** Keep the two win-rate cards and the top/needs-work
  callouts. Consider making them a row of 3–4 stat cards instead of 2+2: overall
  win rate, best opening, worst opening, total games analysed. Use the card
  surface colour (`--color-bg-surface`) with a left border accent.
- **Opening lists:** Replace the current pill-badge layout with a proper table.
  Columns: opening name, games, W, D, L. The W/D/L numbers use the existing
  colour coding (green/orange/red). Sort controls stay (Most played / Best first
  / Worst first). Keep the side-by-side layout (As white / As black) on desktop;
  stack on mobile.
- **Empty state:** When no analysis has been run, show the input bar only with a
  brief explanation. Do not show empty tables.

**What not to change:** The core flow (pick platform → enter username →
analyse). Do not add fictional features like "FIDE rating", "Player dossier", or
"Tactical inconsistency detection".

## 6. Typography

- **Font family:** Keep the current system font stack. Do not switch to a custom
  web font unless there's a clear reason.
- **Headings:** Sentence case, semi-bold (600) or bold (700). The page h1 can be
  larger (32–40px) but not ultra-bold/black weight.
- **Section headings:** 18–20px, semi-bold, sentence case. E.g., "Browse chess
  openings", "My repertoire", "Related openings".
- **Body text:** 14–16px, regular weight, `--color-text-secondary` for
  descriptions.
- **No uppercase transforms.** Remove any `text-transform: uppercase` in the
  codebase and do not add new ones.

## 7. Component and spacing polish

These are small improvements to apply across pages during the overhaul:

- **Card hover states:** Subtle translateY(-2px) with increased shadow on
  opening cards and repertoire cards
- **Consistent border radius:** Standardise on 8px (base) for cards, 6px for
  badges/pills, 4px for inline elements
- **Section spacing:** Use `--space-8` (2rem) between major sections,
  `--space-4` (1rem) between elements within a section
- **Transition timing:** 150ms ease for hovers and focus states
- **Focus-visible outlines:** Ensure all interactive elements have visible focus
  rings for keyboard navigation

## 8. Where decisions live

Design decisions accumulate across conversations. They need a stable home so
that any session can pick up where the last left off.

| What                                           | Where                                  | Why                                          |
| ---------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Design direction, principles, page specs       | This file (TASK016)                    | Single source of truth for the overhaul      |
| Per-chunk decisions made during implementation | Appended to section 10 of this file    | Keeps decisions next to the spec they refine |
| Current work focus and chunk status            | `.github/memory-bank/activeContext.md` | Standard project convention                  |
| Cross-session preferences and corrections      | `.claude/projects/.../memory/`         | Persists into future conversations           |

**Workflow per chunk:**

1. Read this task file to load context
2. Implement the chunk
3. Stop — review with Fred (dev server, screenshots, discussion)
4. Append any decisions or changes to section 10 of this file
5. Update `activeContext.md` with current status
6. Commit the chunk on its own branch or as a distinct commit

## 9. Implementation chunks

Each chunk is a self-contained piece of work that results in a working, visually
reviewable state. After each chunk we stop, run the dev server, and review
together before proceeding.

### Chunk 1: Layout shell — sidebar + content area grid

**Scope:** Build the sidebar component, wire it into `App.tsx`, update the root
CSS grid so every page renders inside a sidebar + content area layout. Pages
keep their existing content unchanged — this chunk only adds the structural
wrapper.

**What to build:**

- `Sidebar.tsx` + `Sidebar.module.css` — logo, two nav items (Discover,
  Analyse), active state, collapsed state
- Update `App.tsx` — wrap `<Routes>` in a layout div with sidebar + content
- Update `simplified.css` — `.app` becomes a CSS grid:
  `grid-template-columns: var(--sidebar-width) 1fr`

**What NOT to touch yet:** Don't remove `LandingHeader` or `GlobalHeader`.
They'll coexist with the sidebar briefly so we can compare the old and new nav
side by side.

**Review checkpoint:**

- [ ] Sidebar renders on all 3 routes (/, /analyse, /opening/:fen)
- [ ] Active item highlights correctly based on route
- [ ] Content area fills remaining width
- [ ] Logo links to /
- [ ] `npm run build` passes
- [ ] `npm run test:frontend` passes

**Files:**

- New: `components/layout/Sidebar.tsx`, `Sidebar.module.css`
- Modified: `App.tsx`, `simplified.css`

---

### Chunk 2: Responsive sidebar — collapse + bottom tabs

**Scope:** Add the responsive behaviour: sidebar collapses to icons at 900px,
disappears at 640px and is replaced by a bottom tab bar.

**What to build:**

- CSS media queries in `Sidebar.module.css` for the collapse breakpoint
- `BottomTabBar.tsx` + `BottomTabBar.module.css` — fixed bottom, 56px, two
  items, shown only below 640px
- Hide sidebar below 640px via media query

**Review checkpoint:**

- [ ] 1440px: sidebar expanded with labels
- [ ] 900px: sidebar collapsed to icons only
- [ ] 640px: sidebar hidden, bottom tabs visible
- [ ] 390px: bottom tabs look correct on mobile
- [ ] Active states work at all breakpoints
- [ ] Page content doesn't jump/shift at breakpoints

**Files:**

- New: `components/layout/BottomTabBar.tsx`, `BottomTabBar.module.css`
- Modified: `Sidebar.module.css`

---

### Chunk 3: Remove old navigation

**Scope:** Now that sidebar + bottom tabs work, remove the old headers. This is
the point of no return for the nav change.

**What to do:**

- Remove `<LandingHeader />` from `LandingPage.tsx` and `AnalyseGamesPage.tsx`
- Remove `<GlobalHeader />` from `OpeningDetailPage.tsx`
- Remove or keep the files — if `GlobalHeader` search logic is needed for
  `ContentHeader` later, keep it for now and mark it as deprecated
- Adjust any page-level padding/margins that assumed the old header height
- Remove the `.landing-header` styles from `simplified.css`

**Review checkpoint:**

- [ ] Discover page: no double nav (sidebar only)
- [ ] Analyse page: no double nav (sidebar only)
- [ ] Detail page: no sticky header — just sidebar + page content
- [ ] Search is temporarily missing on detail page (restored in chunk 5)
- [ ] All pages still functional — links, cards, filters work
- [ ] Mobile bottom tabs are the only nav on small screens

**Files:**

- Modified: `LandingPage.tsx`, `AnalyseGamesPage.tsx`, `OpeningDetailPage.tsx`,
  `simplified.css`
- Possibly removed: `LandingHeader.tsx`

---

### Chunk 4: Discover page — polish (DONE)

**Scope:** Card hover polish, uppercase removal, repertoire surface, sentence
case headings. Hero stays centred (left-align was reverted after review).

**What was done:**

- Card hover: `translateY(-2px)`, subtler shadow, 150ms ease, 8px radius
- Removed all `text-transform: uppercase` (5 occurrences)
- Repertoire section: `--color-bg-surface` background when populated
- "Browse chess openings" in sentence case
- Fixed sidebar layout: `margin-left` instead of broken CSS Grid approach

**Files:**

- Modified: `simplified.css`, `PopularOpeningsGrid.tsx`,
  `RepertoireSection.tsx`, `RepertoireSection.module.css`

---

### Chunk 4b: Replace sidebar with top bar (DONE)

**Scope:** Replace the left sidebar with a sticky top navigation bar. Keep the
mobile bottom tab bar as-is. This is the navigation pivot — sidebar was built in
chunks 1–3 but a top bar is better for a 2-item app (reclaims 200px of
horizontal space, content flows naturally below).

**What to do:**

- Create `TopBar.tsx` + `TopBar.module.css`
  - 56px sticky top bar, `--color-bg-surface` background
  - Logo left ("Opening Book"), nav items right (Discover, Analyse)
  - Orange active state on current route
  - Below 640px: hide nav items (logo only), bottom tabs handle navigation
- Update `App.tsx` — replace `<Sidebar />` with `<TopBar />`
- Update `simplified.css` — remove `margin-left: 200px/64px` from
  `.app-content`, content flows naturally below sticky top bar
- Delete `Sidebar.tsx` + `Sidebar.module.css`

**Review checkpoint:**

- [ ] Top bar renders on all 3 routes (/, /analyse, /opening/:fen)
- [ ] Active item highlights correctly based on route
- [ ] Content area uses full viewport width
- [ ] Logo links to /
- [ ] No search in the top bar (hero search on Discover is sufficient)
- [ ] Mobile: top bar shows logo only, bottom tabs handle navigation
- [ ] `npm run build` passes
- [ ] `npm run test:frontend` passes

**Files:**

- New: `components/layout/TopBar.tsx`, `TopBar.module.css`
- Modified: `App.tsx`, `simplified.css`
- Removed: `Sidebar.tsx`, `Sidebar.module.css`

---

### Chunk 5: Detail page — content header

**Scope:** Add a thin `ContentHeader` bar to the detail page that restores
search (removed with `GlobalHeader` in chunk 3). Search is NOT in the top bar —
it's only needed on the detail page where users want to jump between openings
without going back to Discover.

**What to build:**

- `ContentHeader.tsx` + `ContentHeader.module.css`
  - Back arrow linking to / (Discover)
  - Opening name as text (not a full breadcrumb trail — just context)
  - Search bar on the right (reuse `SearchBar` component with `header` variant)
  - "Surprise me" button (already exists on the current `GlobalHeader`)
- Wire into `OpeningDetailPage.tsx` above the title area

**Search placement rationale:** The hero search bar on Discover is prominent and
works well — duplicating it into the top nav would create two search UIs on the
same page. On Analyse, search is irrelevant (the input is a username field). On
the detail page, users need search to jump between openings, so it belongs in a
`ContentHeader` specific to that page.

**Review checkpoint:**

- [ ] Content header renders above the opening title
- [ ] Back arrow navigates to /
- [ ] Search works — typing finds openings, selecting navigates
- [ ] Surprise me navigates to a random opening
- [ ] Header is thinner than the old `GlobalHeader`
- [ ] Mobile: header adapts (search may collapse to an icon)

**Files:**

- New: `components/layout/ContentHeader.tsx`, `ContentHeader.module.css`
- Modified: `OpeningDetailPage.tsx`
- Possibly removed: `GlobalHeader.tsx` (if all its logic has been extracted)

---

### Chunk 6: Detail page — drop tabs, stack right column

**Scope:** Replace the tabbed panel with vertically stacked sections in the
right column: description, then plans. No tab state.

**What to do:**

- Remove `activeTab` state, `TAB_TYPES` constant, tab button row, and tab panel
  show/hide logic from `OpeningDetailPage.tsx`
- Render description directly below the stats bar with a section heading
- Render `<CommonPlans>` directly below description with a section heading
- Each section gets a subtle top divider (`1px solid var(--color-bg-alt)`)
- Section headings: sentence case, 18px, semi-bold

**What NOT to touch yet:** Videos and studies move to full-width in the next
chunk. For now they can sit in the right column below plans, or be temporarily
hidden — decide at review time.

**Review checkpoint:**

- [ ] No tab buttons visible
- [ ] Description renders below stats bar
- [ ] Plans render below description, split by white/black
- [ ] Dividers between sections are subtle but visible
- [ ] Right column scrolls naturally
- [ ] Chessboard interaction still works (drag, click, navigation)
- [ ] Move notation buttons still work
- [ ] FEN copy/analyse still works

**Files:**

- Modified: `OpeningDetailPage.tsx`, `OpeningDetailPage.module.css`

---

### Chunk 7: Detail page — full-width studies + videos

**Scope:** Move studies and videos out of the right column into full-width
horizontal scrollers below the two-column layout.

**What to do:**

- After the `.two-column-layout` div, add a new full-width section for studies
  (if any exist) and videos (if any exist)
- Each section: heading with count, horizontal scroll container
- `StudiesGallery` and `VideoGallery` may need layout adjustments to render
  horizontally instead of vertically
- Only render sections when data exists (studies.length > 0, videos > 0)

**Review checkpoint:**

- [ ] Studies section appears full-width below the two columns
- [ ] Videos section appears below studies
- [ ] Horizontal scroll works on both
- [ ] Thumbnails are properly sized (not stretched or tiny)
- [ ] Sections don't render when no data exists
- [ ] Mobile: sections stack naturally in single column
- [ ] No visual gap or awkward break between the two-column area and the
      full-width sections

**Files:**

- Modified: `OpeningDetailPage.tsx`, `OpeningDetailPage.module.css`, possibly
  `StudiesGallery.tsx`, `VideoGallery.tsx`

---

### Chunk 8: Analyse page — stat cards + tables

**Scope:** Refresh the Analyse page: left-align, redesign stat cards, replace
pill-badge opening lists with tables.

**What to do:**

- Left-align the hero section (matches Discover page alignment)
- Polish input bar styling (border radius, focus states)
- Redesign summary area: row of stat cards (win rate, best opening, worst
  opening, total games) with `--color-bg-surface` background and left border
  accent
- Replace the pill-badge opening rows with proper tables: columns for opening
  name, games, W, D, L
- Keep sort controls (Most played / Best first / Worst first)
- Keep side-by-side layout (As white / As black) on desktop, stack mobile
- Remove any `text-transform: uppercase`

**Review checkpoint:**

- [ ] Hero is left-aligned
- [ ] Input bar matches Discover search bar styling
- [ ] Stat cards render as a row on desktop
- [ ] Tables show W/D/L with colour coding
- [ ] Sort controls work
- [ ] Side-by-side on desktop, stacked on mobile
- [ ] Analysis flow works end-to-end (enter username → analyse → results)
- [ ] Empty state looks correct (no analysis run yet)

**Files:**

- Modified: `AnalyseGamesPage.tsx`, `PersonalOpeningStats.tsx`, `simplified.css`

---

### Chunk 9: Global polish pass

**Scope:** Final consistency pass across all pages. This is the last chunk
before the overhaul is considered complete.

**What to do:**

- Audit all headings for sentence case — grep for `text-transform: uppercase`
  and any hardcoded all-caps strings
- Standardise border radius: 8px cards, 6px badges, 4px inline elements
- Consistent section spacing: `--space-8` between sections, `--space-4` within
- Add `focus-visible` outlines to all interactive elements
- Ensure transition timing is 150ms ease everywhere
- Remove any dead CSS from removed components (LandingHeader styles, old tab
  styles)
- Run `npm run format` to ensure Prettier compliance

**Review checkpoint:**

- [ ] No uppercase transforms in CSS
- [ ] No all-caps headings in JSX
- [ ] Consistent spacing across pages
- [ ] Focus rings visible on keyboard navigation
- [ ] No dead CSS or unused component files
- [ ] `npm run test:frontend` — all tests pass
- [ ] `npm run build` — clean compile
- [ ] `npm run format:check` — clean

**Files:**

- Modified: `simplified.css`, various component files

## 10. Decision log

Decisions made during implementation are appended here with dates. This keeps
the spec (sections 1–7) stable while capturing adjustments.

### 2026-03-21 — [chunk 1] Logo simplified, no monogram

Dropped the orange "OB" monogram box from the sidebar logo. "Opening Book" is
now plain text (system font, 15px semi-bold, centred vertically via flexbox).
The monogram felt heavy and unnecessary — the wordmark is short enough to fit
the 200px sidebar comfortably, and at 64px collapsed the logo hides entirely
(nav icons are sufficient orientation).

Updated section 3 spec: "Logo" line now reads "'Opening Book' wordmark at the
top of the sidebar" — the "or 'OB' monogram" alternative is removed.

**Files created:** `Sidebar.tsx`, `Sidebar.module.css` **Files modified:**
`App.tsx`, `simplified.css` **Build:** clean. **Tests:** 163/163 pass.

### 2026-03-21 — [chunk 2] Responsive sidebar + bottom tabs

Sidebar collapse (900px) and hide (640px) media queries were already in place
from chunk 1. Chunk 2 added:

- `BottomTabBar.tsx` + `BottomTabBar.module.css` — fixed bottom nav shown only
  below 640px. Uses `NavLink` with same `tabItems` array as sidebar for
  consistency. Orange text on active tab (no filled-icon distinction — both
  icons are outline-style from lucide-react at all states, which looks clean).
- `padding-bottom: 56px` on `.app-content` at the 639px breakpoint to prevent
  the tab bar from covering page content.

No spec deviations. All four breakpoints verified visually (1440, 900, 640,
390).

**Files created:** `BottomTabBar.tsx`, `BottomTabBar.module.css` **Files
modified:** `App.tsx`, `simplified.css` **Build:** clean. **Tests:** 163/163
pass.

### 2026-03-21 — [chunk 3] Remove old navigation

Removed `LandingHeader` from `LandingPage.tsx` and `AnalyseGamesPage.tsx`.
Deleted `LandingHeader.tsx` entirely — no remaining references.
`GlobalHeader.tsx` is kept for now (not used anywhere, but its search logic may
inform `ContentHeader` in chunk 5).

Reduced hero section top padding from `100px` to `var(--space-8)` (desktop) and
`var(--space-6)` (tablet/mobile) — the 100px was compensating for the
absolutely-positioned `LandingHeader` overlay. Removed all `.landing-header*`
styles and their responsive media query block from `simplified.css`.

No spec deviations. GlobalHeader was already not wired into
`OpeningDetailPage.tsx` so no changes needed there.

**Files deleted:** `LandingHeader.tsx` **Files modified:** `LandingPage.tsx`,
`AnalyseGamesPage.tsx`, `simplified.css` **Build:** clean. **Tests:** 163/163
pass.

### 2026-03-21 — [chunk 4] Discover page left-align + polish

Left-aligned the hero section (h1, subtitle, search bar, PGN link, Surprise me
button). Changed `.hero-content` from `text-align: center` to
`text-align: left`, removed `margin: 0 auto` from subtitle and search wrapper.
Search input placeholder text also left-aligned.

Standardised horizontal padding to `var(--space-8)` (2rem) across hero, section
headers, filter container, and openings grid — consistent alignment. Mobile
breakpoint (768px) falls back to `var(--space-4)`.

Card hover refined from `translateY(-6px)` with heavy shadow to
`translateY(-2px)` with subtler shadow, matching the spec's "subtle hover lift".
Transition timing changed from `0.3s` to `150ms`. Card `border-radius` changed
from `--border-radius-large` (12px) to `--border-radius-base` (8px) per section
7 specification. Removed `will-change` property (unnecessary for simple
transforms).

Removed all `text-transform: uppercase` from the codebase — 5 occurrences across
`.group-label`, `.eco-pill`, `.fen-utilities-label`,
`.suggestion-item .eco-code`, and `.personal-insight__tag`. ECO codes are
already uppercase in the data so no visual change there. Only `capitalize`
(complexity badges) and `none` (reset) remain.

Added conditional `.hasOpenings` class to `RepertoireSection` that applies
`background-color: var(--color-bg-surface)` and border-radius when the user has
saved openings, giving the section a subtle surface distinction.

Changed "Browse Chess Openings" heading to "Browse chess openings" (sentence
case).

No spec deviations. W/D/L bar height was already consistent at 8px — no change
needed.

**Files modified:** `simplified.css`, `PopularOpeningsGrid.tsx`,
`RepertoireSection.tsx`, `RepertoireSection.module.css` **Build:** clean.
**Tests:** 163/163 pass.

### 2026-03-21 — [chunk 4] Revert hero to centred, fix sidebar layout

Reverted hero from left-aligned to centred after visual review. The left-aligned
hero left a large empty right side and broke visual continuity with the centred
card grid below. Centred hero works better because the sidebar is a navigation
rail, not a content column — the content area should feel self-contained.

Also fixed a layout bug: the sidebar uses `position: fixed` which removes it
from flow, so CSS Grid `grid-template-columns: 200px 1fr` didn't work (the
sidebar didn't occupy grid space, causing content to render in the wrong
column). Replaced the grid approach with `margin-left` on `.app-content`
matching the sidebar width at each breakpoint (200px → 64px → 0).

Updated section 5a spec: removed "left-align the hero text and search bar" —
hero stays centred within the content area.

**Build:** clean.

### 2026-03-21 — [chunk 4b] Sidebar → top bar decision

Decided to replace the left sidebar with a sticky top navigation bar after
reviewing the sidebar implementation with the centred hero. The sidebar works
but burns 200px of horizontal space for just 2 nav items — excessive for a
content-first app. A top bar costs only 56px of vertical space, gives content
the full viewport width, and matches the pattern used by Lichess, Chess.com, and
most chess tools.

The mobile bottom tab bar (built in chunk 2) is preserved — it works well and
remains the mobile navigation pattern.

Updated section 3 spec from "left sidebar navigation" to "top bar navigation".
Added chunk 4b to the implementation plan.

### 2026-03-21 — [chunk 4b] Top bar implementation

Replaced the left sidebar with a sticky top navigation bar.

**Design decisions made during review:**

- **Centred nav** — 2 items were lost in the far-right corner with
  `space-between`. Used `grid-template-columns: 1fr auto 1fr` to true-centre the
  nav regardless of logo width.
- **Text-only nav** — dropped icons (compass, bar-chart). With only 2 items in a
  horizontal bar, text alone is more confident. Icons are kept in the mobile
  bottom tab bar where labels are tiny.
- **Underline active state** — orange bottom border instead of background pill.
  Conventional for horizontal navs (GitHub, YouTube, Lichess pattern).
- **No font-weight shift on active** — going 500→600 causes layout jank as text
  width changes. Kept 500 for both states; orange colour + underline is
  sufficient differentiation.
- **Focus-visible outlines** — added orange focus rings on logo and nav items
  per spec section 7.

**Files created:** `TopBar.tsx`, `TopBar.module.css` **Files modified:**
`App.tsx`, `simplified.css` **Files deleted:** `Sidebar.tsx`,
`Sidebar.module.css` **Build:** clean. **Tests:** 163/163 pass.

### 2026-03-21 — [chunk 5] Search placement decision

Search does NOT go in the top bar. Rationale:

- **Discover page:** The hero search bar is the primary UI — prominent, centred,
  well-placed. Adding search to the top bar would create two search inputs on
  the same page.
- **Analyse page:** Search is irrelevant — the input is a username field, not an
  opening search.
- **Detail page:** Search is needed here — users want to jump between openings
  without navigating back to Discover. This is what the old `GlobalHeader`
  provided. Search moves into a `ContentHeader` bar specific to the detail page
  (below the top nav, above the opening title).

This keeps search contextual rather than omnipresent.

<!--
Format for entries:

### YYYY-MM-DD — [chunk N] Short description
Decision and rationale here. Reference the chunk number and what changed.
If a decision changes something in sections 1–7 above, update those
sections too and note it here.
-->

## 11. Out of scope

- Account system or server-side repertoire
- Custom web fonts (Geist or otherwise)
- Stock photography or decorative images
- "Pro" / premium tier features
- Engine analysis or mastery tracking
- Renaming the product from "Opening Book"
- Light theme / theme toggle

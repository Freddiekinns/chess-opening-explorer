# [TASK008] - Competitive Analysis & Feature Opportunities

**Status:** Reference / Strategy **Added:** 2026-02-28 **Updated:** 2026-02-28
**Author:** Fred Wildi (via Claude analysis session)

---

## Purpose

This document analyses the competitive landscape for chess opening learning
tools and identifies 3–5 high-value features that OpeningBook
(openingbook.vercel.app) should explore building next. The goal is to sharpen
the product's identity and move it from a reference tool toward a genuine
learning platform.

---

## What OpeningBook Is

OpeningBook is a chess learning platform for beginner-to-intermediate players
(target: under 1800 Elo). It combines:

- **12,377+ openings** with ECO codes and move sequences
- **Lichess popularity statistics** (win/draw/loss rates from 40M+ games)
- **AI-generated content** (descriptions, strategic ideas, complexity ratings
  via Google Gemini)
- **Curated video integration** (1,000+ YouTube videos from trusted channels)
- **Curated Lichess studies** (6,100+ study chapters matched to openings by FEN)
- **Interactive practice mode** (move trainer with hints, feedback, visual
  indicators)
- **Personal Opening Explorer** (Chess.com + Lichess game history analysis,
  actionable insights)
- **PGN identification** (paste any game to identify the opening)

**Core strength:** The richest single-page opening reference for club-level
players — combining statistical data, expert content, and curated learning
resources in one place.

**Current positioning gap:** OpeningBook is excellent for _finding and reading
about_ openings, but doesn't yet provide a strong loop for _learning and
retaining_ them.

---

## Competitive Landscape

### Chess.com Opening Explorer

**Strengths:**

- Deep master game database (~3M games), updated weekly
- Tight integration with personal game history (see your own moves vs. master
  moves side-by-side)
- Stockfish evaluations inline with move popularity
- Large, engaged user base (network effects)

**Weaknesses:**

- Core explorer locked behind a paid subscription (free users limited to 4-move
  depth — effectively useless)
- No rating-range filtering; purely master-focused
- Opening explorer is a feature of a broader play platform, not a dedicated
  learning tool

**Relevance for OpeningBook:** Chess.com's paywall is a genuine opportunity.
OpeningBook offers a better free experience right now for players who just want
to learn openings.

---

### Lichess Opening Explorer

**Strengths:**

- Completely free, open source
- Enormous accessible game database (all Lichess games, not just masters)
- **Rating-range filtering** — see what 1200-rated players play vs. 2600-rated
  players (unique, powerful feature)
- Visual move quality indicators (best/good/dubious)
- Lightweight, fast UI

**Weaknesses:**

- No learning layer — it's a pure reference tool with no practice, spaced
  repetition, or personalised guidance
- No AI content, no videos, no curated studies
- Minimal personalisation beyond rating filtering

**Relevance for OpeningBook:** Lichess's rating filtering is the one feature
OpeningBook clearly lacks from their explorer. The rest (learning content,
practice, personal analysis) OpeningBook already does better.

---

### Chessable

**Strengths:**

- **MoveTrainer® spaced repetition engine** — the gold standard for opening
  memorisation. Scientifically backed scheduling (levels 1–8: 4 hours to 6
  months between reviews)
- Forces active recall: you can't just scroll — you must play each move
- High-quality authored courses from elite GMs (Magnus, Hikaru, Anish Giri,
  etc.)
- Strong course catalogue: 300+ covering openings, middlegame, and endgames

**Weaknesses:**

- No opening explorer or database — you can't browse; you must follow a pre-set
  course
- Most quality content is paywalled (PRO subscription or per-course purchase)
- Course-based structure means you learn someone else's repertoire, not
  necessarily your own game
- No integration with personal game history

**Relevance for OpeningBook:** Chessable built an entire business on spaced
repetition for chess openings. This is the most significant gap in OpeningBook —
it has a practice mode but no scheduling layer to bring players back to review
forgotten lines. There's an opportunity to deliver this free where Chessable
charges.

---

### ChessTempo

**Strengths:**

- **Repertoire builder** — custom, move-by-move with spaced repetition and
  multiple training modes
- **Live game integration** — automatically detects deviations from your
  repertoire after each online game
- **Sunburst visualisation** — see your entire repertoire as a tree; identify
  gaps at a glance
- Learning priority mode: weights popular lines higher, so you learn what
  matters first
- Multiple SRS strategies available (spaced repetition, ordered review,
  least-recently-seen)

**Weaknesses:**

- No built-in opening explorer or database — requires external reference sources
- Dated, complex UI; high learning curve
- Smaller community and visibility vs. Chess.com/Lichess
- Requires manual repertoire construction (no "adopt this database line"
  shortcut)

**Relevance for OpeningBook:** ChessTempo's repertoire builder + live game
feedback is genuinely powerful, but the friction of building a repertoire from
scratch is a real barrier. OpeningBook already has all the opening data — if
users could save lines directly from the explorer to a personal repertoire, that
solves ChessTempo's biggest UX problem.

---

### 365Chess

**Strengths:**

- Comprehensive ECO encoding database (excellent reference)
- Player-specific opening analysis (see how Carlsen plays the Sicilian)
- Simple win-percentage bars — intuitive at a glance
- 4.2M+ games across player levels

**Weaknesses:**

- Dated, cluttered UI — the weakest UX of any major competitor
- No learning features whatsoever
- No personalisation, no video content, no spaced repetition

**Relevance for OpeningBook:** 365Chess is a reference tool OpeningBook largely
supersedes already. Not a strategic concern.

---

## Gap Analysis: Where OpeningBook Sits

| Feature                        | OpeningBook               | Chess.com       | Lichess      | Chessable           | ChessTempo        |
| ------------------------------ | ------------------------- | --------------- | ------------ | ------------------- | ----------------- |
| Opening database               | ✅ 12,377 openings        | ✅ Master games | ✅ All games | ❌ Course-only      | ❌ Needs external |
| Popularity statistics          | ✅ Lichess master data    | ✅              | ✅           | ❌                  | ❌                |
| AI-generated content           | ✅ Gemini                 | ❌              | ❌           | ✅ GM authored      | ❌                |
| Curated videos                 | ✅ 1,000+                 | ❌              | ❌           | ✅ Video courses    | ❌                |
| Curated studies                | ✅ 6,100+                 | ❌              | ❌           | ❌                  | ❌                |
| Practice mode                  | ✅                        | ❌              | ❌           | ✅ MoveTrainer      | ✅                |
| **Spaced repetition**          | ❌                        | ❌              | ❌           | ✅✅ (core product) | ✅                |
| **Repertoire builder**         | ❌                        | ❌              | ❌           | ❌                  | ✅✅              |
| Personal game analysis         | ✅ (Chess.com + Lichess)  | ✅              | Limited      | ❌                  | ✅ (live games)   |
| **Rating-range filtering**     | ❌                        | ❌              | ✅           | ❌                  | ❌                |
| **Live game deviation alerts** | ❌                        | Partial         | ❌           | ❌                  | ✅                |
| **Middlegame plan bridge**     | Partial (AI descriptions) | ❌              | ❌           | ✅ (some courses)   | ❌                |
| Free access                    | ✅                        | ❌ (paywalled)  | ✅           | Partial             | Partial           |

**Summary of OpeningBook's gaps:**

1. No spaced repetition scheduling (the biggest structural gap)
2. No personal repertoire — users can't save "their" lines
3. No rating-contextualised move data (what players at my level actually play)
4. The opening–middlegame transition is under-developed
5. No real-time feedback loop from actual games played

---

## Feature Recommendations

These are ranked by **impact for the target user (sub-1800 players) ×
feasibility given the existing stack**, with preference for features that
leverage OpeningBook's existing data advantages.

---

### FEATURE 1: Spaced Repetition Drill Scheduler (Highest Priority)

**The gap it fills:** Nobody else combines a world-class free opening database
with spaced repetition. Chessable owns SRS for chess, but behind a paywall and
without a browseable database. OpeningBook already has the practice mode — this
feature adds the _scheduling layer_ on top.

**What it does:**

- After practising an opening, the user is prompted to save it to their "Review
  Queue"
- A scheduling algorithm (simple interval-based, e.g. 1 day → 3 days → 7 days →
  21 days) determines when to resurface each opening
- A "Due for Review" dashboard shows what needs to be practised today
- The existing practice mode is reused for the actual drill — no new UI needed
  for that part

**Why it matters for sub-1800 players:** These players learn openings then
forget them by their next game. SRS solves this directly. It's the single
biggest reason Chessable has a loyal user base.

**Technical approach:**

- Store review state in `localStorage` (or a lightweight user account system if
  auth is added)
- Scheduling logic is simple — no ML needed, classic interval scheduling works
  well
- Hooks into the existing practice mode (`/opening/:fen` page)
- New "Review" page (`/review`) showing today's due items

**Risks / considerations:**

- Requires some notion of user state persistence (localStorage is fine for v1;
  avoids needing auth)
- The practice mode already has the hard part — move validation, feedback, hints
- Worth studying how Chessable's level system (1–8) maps to intervals

---

### FEATURE 2: Personal Repertoire Builder

**The gap it fills:** Users can explore and practice openings but can't save
"this is my repertoire." ChessTempo has the best repertoire builder on the
market, but it requires building from scratch — OpeningBook can let users adopt
lines directly from its 12,377-opening database with one click.

**What it does:**

- "Add to My Repertoire" button on any opening detail page
- Users can mark openings as White/Black and assign a priority
- A "My Repertoire" page shows all saved lines as a list (v1) or a visual tree
  (v2)
- Pairs directly with the spaced repetition scheduler (Feature 1)
- Optional: export repertoire as PGN for use in other tools

**Why it matters for sub-1800 players:** They often ask "what should I study?" A
personal repertoire answers this. The insight is that OpeningBook already has
all the candidate lines — users just need to curate from them.

**Technical approach:**

- Save to `localStorage` as JSON:
  `{ fen: string, color: 'white' | 'black', addedAt: timestamp, priority: number }[]`
- Repertoire page reads localStorage and maps to opening metadata from the
  existing API
- Tree visualisation (v2) is a known-difficult but well-documented problem;
  start with a flat list
- PGN export is straightforward given the existing chess.js integration

**Risks / considerations:**

- localStorage is ephemeral (lost if user clears browser); long-term would
  benefit from optional account sync
- The "manage many lines" UX gets complex — needs clear prioritisation controls
- Worth adding a "suggested repertoire" starter pack (e.g. "recommended openings
  for <1500") to lower the initial barrier

---

### FEATURE 3: Rating-Contextualised Move Statistics

**The gap it fills:** OpeningBook currently shows Lichess master game
statistics. But 90% of the target audience (sub-1800) will never face
master-level play. Lichess's opening explorer already has rating filtering — and
it's their standout differentiator. OpeningBook should bring this to its own
explorer.

**What it does:**

- On each opening detail page, add a rating range selector (e.g. <1200 /
  1200–1500 / 1500–1800 / 1800+)
- Win/draw/loss stats and most popular continuations update to reflect games
  played at that rating range
- The insight: "1200-rated players almost always respond with e5 here, not d5.
  Study what they actually play."

**Why it matters for sub-1800 players:** This is genuinely the most _actionable_
stat for a club-level player. Knowing what Magnus Carlsen plays in a given
position is close to useless when your opponents are rated 1100–1500. This
feature makes OpeningBook's statistics meaningfully personalised.

**Technical approach:**

- Lichess provides a public opening explorer API
  (`https://explorer.lichess.ovh/lichess`) with `ratings` query param (e.g.
  `1000,1200,1400,1600,1800`)
- This is a runtime API call, not a static pipeline — fetched client-side per
  position
- Cache responses (5–10 mins) in browser to respect rate limits
- The existing popularity stats display just needs a toggle/selector added to
  its UI

**Risks / considerations:**

- Lichess API is rate-limited; need sensible client-side caching
- The current popularity stats come from a pre-built static JSON
  (`popularity-stats.json`); this feature bypasses that in favour of live API
  calls per position — a slight architectural shift for this component
- The feature is bounded: only works for positions in the Lichess database
  (which is essentially all of them)

---

### FEATURE 4: Opening-to-Middlegame Bridge ("What Do I Do Next?")

**The gap it fills:** The most common complaint from club players is "I know my
opening but don't know what to do when it's over." OpeningBook already generates
AI content via Gemini — but current descriptions are mostly theoretical. This
feature extends them to explicitly address middlegame plans, typical pawn
structures, and thematic ideas.

**What it does:**

- A dedicated "Plans" tab on each opening detail page (this may already exist
  partially — the context mentions Plans tab)
- Per opening: 3–5 bullet-point middlegame themes (e.g. "Typical kingside attack
  via f4-f5", "Minority attack on the queenside", "Key piece to activate: the c8
  bishop")
- Linked to visual board positions showing the thematic structure
- For major openings, link to relevant Lichess studies or YouTube videos already
  in the database that cover the middlegame

**Why it matters for sub-1800 players:** Study after study of chess improvement
identifies "I don't know the plans" as the core gap after openings. No platform
addresses this specifically — Chessable's recent courses attempt it, but only
for paying users within specific courses.

**Technical approach:**

- Extend the existing LLM enrichment pipeline (`tools/llm-enrichment/`) to
  generate "middlegame themes" alongside existing content
- Structured prompt to Gemini: "Given this opening position, list 3–5 concrete
  middlegame plans for the winning side, including typical piece manoeuvres and
  pawn breaks"
- Store as a new field in `openings.json` (idempotent, same pipeline pattern as
  existing enrichment)
- Frontend: add a "Plans" section to the opening detail page (or enhance the
  existing one if present)

**Risks / considerations:**

- LLM accuracy for positional plans is better than for factual claims (URLs,
  player names), so the conservative AI policy (AD-005) is less of a concern
  here
- Need validation — a human review pass on a sample of generated plans before
  deploying broadly
- Some openings (very obscure ECO codes) have limited middlegame theory; the LLM
  may produce generic content. Filtering by a minimum game-count threshold would
  help

---

### FEATURE 5 (Existing Plan — Refine & Prioritise): Mistake Trainer / Blunder Detection (TASK005)

**Already in the roadmap.** This is noted here because it belongs in the same
strategic grouping as the features above and deserves to be elevated in
priority.

**Why it's strategically important:** ChessTempo's live game feedback loop is
one of its strongest features. OpeningBook already has personal game analysis
(Personal Opening Explorer) and plans Stockfish integration. Combining these
gives a feature none of the competitors has in its complete form: _identify
specifically where you deviated from theory in your own games, then drill that
exact position_.

**Refinements to the TASK005 plan:**

- The "deviation from book" detection is arguably more valuable than pure
  Stockfish blunder detection. Many opening mistakes are not eval blunders;
  they're moves that are objectively playable but leave the opponent in their
  prepared territory.
- Consider distinguishing two levels: (a) "Book deviation" — you left the known
  theory, (b) "Blunder" — your move was objectively bad. These have different
  remedies.
- The mistake trainer should link back to the opening detail page for the
  position where the mistake occurred, making the study loop complete.

---

## Recommended Build Order

Given the target audience (sub-1800), the existing stack, and OpeningBook's
current strengths, I'd suggest the following sequencing:

| Priority | Feature                               | Why Now                                                                                                                                                    |
| -------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Rating-Contextualised Move Statistics | Highest impact per effort ratio. One API integration, leverages existing stats UI, immediately differentiates from every competitor except Lichess itself. |
| 2        | Spaced Repetition Drill Scheduler     | Transforms OpeningBook from reference tool to learning tool. Builds on existing practice mode. localStorage means no auth needed for v1.                   |
| 3        | Mistake Trainer (TASK005)             | Already planned, strong demand, closes the learning loop between real games and the opening database.                                                      |
| 4        | Personal Repertoire Builder           | Natural complement to SRS. Can ship as a flat list (localStorage) first, then evolve.                                                                      |
| 5        | Opening-to-Middlegame Bridge          | High user value but requires LLM pipeline work and human review. Best as a content-first feature once the learning loop (SRS + Repertoire) is in place.    |

---

## Strategic Framing

OpeningBook's opportunity is to become the **free Chessable** — but better,
because:

1. **It has a database**. Chessable is course-only; OpeningBook has 12,377
   openings to explore.
2. **It has personalisation**. The Personal Opening Explorer already knows what
   users are weak in; no competitor does this free.
3. **It has content depth**. Videos, studies, AI descriptions — richer than any
   free competitor.
4. **The learning loop is almost complete**. Practice mode exists. Adding SRS +
   repertoire saving closes the loop that currently exists only on paid
   platforms.

The gap is converting one-time visitors (who explore an opening) into returning
learners (who practice and review). The features above are specifically designed
to close that gap.

---

## Related Tasks

- [TASK005] Stockfish Analysis & Blunder Detection (Pending)
- [TASK006] Coverage Updates (Pending)

---

## Next Steps

Review this analysis and decide which feature(s) to spec first. Suggested
starting point: **Feature 3 (Rating-Contextualised Stats)** — it can be scoped
and shipped quickly, provides immediate user value, and doesn't require new
infrastructure.

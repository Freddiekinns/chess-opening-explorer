# [TASK008] - Feature Roadmap & Exploration

**Status:** Reference / Strategy **Added:** 2026-02-28 **Updated:** 2026-05-04
**Author:** Fred Wildi (with Claude)

---

## Purpose

This document replaces the prior competitive-analysis version of TASK008. It
explores a set of candidate features for OpeningBook at a user-experience level
— how each one feels to use, who it's for, and what it costs to build relative
to the value it delivers. It is intentionally _not_ an implementation spec. Each
feature picked up from this list will get its own design and plan when it's
ready to be built.

The original competitive-analysis content is preserved in the git history of
this file.

---

## Context

OpeningBook today is the richest single-page opening reference for
beginner-to-intermediate club players (target: under 1800 Elo). It combines a
12,377-opening database with Lichess popularity stats, AI-generated content,
1,000+ curated YouTube videos, 6,100+ curated Lichess studies, an interactive
practice mode, and a Personal Opening Explorer that ingests Chess.com and
Lichess game history.

The product is strong as a place to _find and read_. The next chapter is making
it a place to _return to_ — building features that bring users back, surface
their personal weaknesses, and turn one-off lookups into a learning loop. The
features below are framed in that direction.

---

## Guiding constraints

These constraints shape every feature decision in this document.

- **Authentication stays optional.** No feature in the main path may _require_
  an account. Anonymous use is the default and must remain fully usable. Any
  account-style identity, if added, must demonstrably unlock something the user
  asks for (sync across devices, public profile) — not gate things they already
  have.
- **localStorage is the default persistence layer.** Cross-device sync is a
  later consideration, not a v1 requirement.
- **Sub-1800 audience comes first.** When a feature has both a "club player" and
  a "titled player" version, the club version wins. Master-level features are a
  "nice if cheap" bonus, not a goal.
- **Monetisation is non-coercive only.** Tip jar (Buy Me a Coffee / similar) and
  affiliate links to existing partners (Chessable, Chessly, books). No feature
  gating, no subscription tier, no paywall on existing functionality.
- **Free-tier infrastructure.** Vercel + static JSON + client-side compute
  remains the spine. Features that demand a database, a queue, or always-on
  workers need to clear a high bar.

---

## Feature explorations

Each feature uses the same template:

- **What it is** — one paragraph
- **How it works for a user** — the actual click-by-click experience
- **Who it's for** — which player, which moment
- **Complexity** — S / M / L, with the dominant cost driver
- **Benefit** — H / M / L, with the case
- **Risks & open questions**

---

### 1. Master / FIDE games tab

**What it is.** A new tab on the opening detail page (alongside Videos, Studies,
etc.) showing real master-level games that reached this exact position, with the
result, players, year, and a link to play through the full game.

**How it works for a user.** On any opening detail page, the user clicks a
"Master Games" tab. They see a sortable list — date, players (e.g. "Carlsen vs.
Nepomniachtchi, 2021"), result, and event. Clicking a row opens a small inline
replayer (or a link out to a Lichess broadcast / PGN viewer) where they can step
through the moves. They can filter by year range, result, or player name. A
subtle "from this position" indicator shows the move number where the opening
transitions to middlegame.

**Who it's for.** Curious browsers and the more aspirational end of the audience
(1500–1800) who want to see what real top-level play in their opening looks
like. Less directly useful for total beginners — but emotionally valuable:
"Magnus plays this exact line, with Black, in 2023."

**Complexity.** **M.** Lichess provides a free Masters database via its opening
explorer API (`explorer.lichess.ovh/masters`) keyed by FEN, returning move
frequencies and game IDs. Pulling a list of game IDs and rendering them is
mostly a UI exercise — no new pipeline. Building a polished replayer is the real
cost; we already use chess.js, so a minimal replayer is achievable, but a _good_
one (arrow annotations, eval bar, jump-to-move) is a sub-feature in its own
right. Punting to Lichess game links keeps complexity to S.

**Benefit.** **M.** It's a credibility and depth feature more than a learning
feature. Players don't typically improve by replaying a Carlsen game — but they
trust a site more that shows them. It also pairs naturally with the existing
tabbed structure, so it doesn't fight the IA.

**Risks & open questions.**

- For the very long tail (obscure ECO codes), the masters database has zero
  hits. The tab should hide or show a "no master games for this exact line"
  empty state rather than disappear silently.
- Decision: build our own inline replayer or link out? Linking out is faster and
  cheaper but breaks the on-site flow. Recommendation: link out for v1, build
  inline when this becomes the marginal feature blocking retention.
- Where it lives in the navigator order matters — probably _after_ Videos and
  Studies, since it serves a different need (curiosity vs. learning).

---

### 2. Opening family rollups

**What it is.** A grouping layer on top of the existing opening database that
lets the user (and the system) treat e.g. "Sicilian Defense, Najdorf, Poisoned
Pawn" as a member of the broader "Sicilian Defense" family. The Analyse page,
Search, and Repertoire UI all become aware of families, so a user who plays
seven different Sicilian sub-variations sees "Sicilian (7 games)" rolled up
rather than seven scattered one-game rows.

**How it works for a user.**

- **On Analyse:** the personal opening stats list has a toggle (or default) for
  "Group by family". Instead of 23 mostly-one-game rows, the user sees 6 family
  rows (Sicilian — 7 games — 43% score; Caro-Kann — 4 games — 65% score; etc.)
  with an expand chevron to drill into specific variations. The win-rate bar and
  sample size become statistically meaningful.
- **On Search:** typing "Sicilian" surfaces a family card at the top of results
  — "Sicilian Defense (1,247 variations)" — with a click-through to a family
  overview page that lists popular sub-variations and shared themes.
- **On Repertoire:** "Add to repertoire" can target a family ("I play the
  Sicilian as Black") in addition to specific lines. The repertoire UI shows
  family-level rollups by default with expandable variations inside.
- **On opening detail:** the existing orange family-coloured header already
  hints at this. Clicking the family name (e.g. "Sicilian Defense") navigates to
  the family overview page.

**Who it's for.** Mostly two groups: (a) the Analyse user staring at a
fragmented stats list that doesn't tell them anything actionable, and (b) the
intermediate player who thinks of their game in family terms ("I'm a Sicilian
player") rather than ECO codes.

**Complexity.** **M.** The data is already implicit in our taxonomy (the header
colour is family-derived). Making it _explicit_ as a first-class entity means:
defining the family list (likely 20–30 families), mapping every opening to one,
exposing this in the API, and updating three or four UI surfaces. The data work
is straightforward; the UI work is where it accumulates. Bonus: a family
overview page is itself a new template that needs design.

**Benefit.** **H.** This is probably the most underrated feature on the list.
It's the difference between Analyse showing "your data is sparse" and "you score
43% as Black against 1.e4 — and most of your losses are in the Sicilian Najdorf,
specifically when White plays 6.Bg5". It also dramatically improves search
discoverability for newcomers who don't know ECO codes but know the word
"Sicilian".

**Risks & open questions.**

- Family taxonomy is fuzzy at the edges. Is the Pirc its own family or part of
  the Modern? Where does the King's Indian Attack go — White system or shared
  with KID? Decision needed: hand-curate ~25 families with explicit edge-case
  resolution, vs. auto-derive from the ECO tree (probably hand-curate, the tail
  is small).
- Family-level stats need careful aggregation. Score-against-Sicilian isn't just
  the average of sub-variation scores; it's weighted by how often each is
  reached. The existing stats pipeline can do this but it's a real sub-task.
- Backwards compatibility: the URL structure for opening pages stays
  variation-keyed; family pages are additive, not a replacement.

---

### 3. Community signal — votes & suggestions

**What it is.** A lightweight community layer on the curated content. Users can
thumbs-up / thumbs-down videos and studies attached to an opening on a "is this
actually relevant?" axis. A separate submission form lets users suggest new
resources (videos, studies, courses, articles) for any opening. Both feed a
moderation queue that you (Fred) review periodically.

**How it works for a user.**

- **Voting:** under each video or study card on the opening detail page, two
  small icons — thumbs up ("yes, this is about this opening") and thumbs down
  ("no, this is mislabelled / off-topic"). Anonymous, one vote per
  fingerprint+IP per resource per opening. The vote count is shown if it's above
  a small threshold; otherwise hidden to avoid bandwagoning. Resources that
  exceed a downvote threshold get a subtle "Flagged for review" tag and are
  sorted to the bottom (not hidden) until you review them.
- **Suggesting:** a "Suggest a resource for this opening" link below the
  resource lists. Opens a small form: type (video / study / course / article),
  URL, optional one-line note. Submissions go to a moderation queue (likely a
  simple JSON file plus a private review UI, or a GitHub issue / Linear ticket —
  see open questions). User sees "Thanks, we'll review your suggestion" and
  that's it; no account, no notification.
- **Your moderation pass:** weekly or monthly, you open the queue, see flagged
  resources and new suggestions, click approve/reject. Approved suggestions are
  folded into the next data deploy.

**Who it's for.** Two audiences are served simultaneously: (a) users who get a
small _signal_ from existing votes ("everyone agrees this video is great for
this line"), and (b) the small subset of power users who actively want to
contribute. The latter are rare but disproportionately valuable.

**Complexity.** **L.** This is the only feature on this list that meaningfully
expands the infrastructure. Votes need a write endpoint, persistent storage,
abuse mitigation (rate limiting by IP+fingerprint), and a way to surface the
data in the existing static-JSON build. Suggestions need a form, an inbox, and a
moderation UI (or a stand-in like a private GitHub repo issues board). None of
these are _hard_; they're just outside the current "static JSON + client
compute" architecture.

**Benefit.** **M.** Vote data improves quality slowly over time, and the
suggestion pipeline is a long-term compounding asset (right now you find new
resources manually). But the immediate user-visible benefit is modest: most
users won't notice a few thumbs icons. The strategic benefit is bigger — it
opens a community surface — but that's longer-horizon.

**Risks & open questions.**

- **Storage backend.** Pure-static JSON breaks down here because writes are
  involved. Options: Vercel KV / Postgres (Marketplace), a simple SQLite via
  Turso, or a JSON-in-blob in Vercel Blob storage with optimistic concurrency.
  Cheapest is probably an Edge Config or KV write through a Vercel Function —
  this is a real architectural decision. _(Confirmed via knowledge update:
  Vercel Postgres / KV are now offered through the Marketplace rather than as
  first-party products.)_
- **Abuse.** Anonymous votes will be brigaded if anyone cares enough. For v1,
  IP+fingerprint dedup is fine; if it becomes an issue, escalate to hCaptcha or
  BotID.
- **Submission moderation overhead.** If a single contributor submits 200 things
  in a week, you need a way to bulk-handle that. The MVP is a simple inbox;
  don't over-engineer until volume is real.
- **Decision: build the moderation UI vs. pipe to GitHub issues?** GitHub issues
  is a credible MVP — submissions create issues, you triage in GitHub, approved
  ones get folded into the data files via PR. Zero new UI.

---

### 4. Rating-contextualised stats

**What it is.** Move-frequency and result data on each opening detail page,
filtered by the rating range of the players in the games. Today's stats are
based on master games, which is the wrong reference class for sub-1800 players.

**How it works for a user.** A pill selector above the popularity stats:
`<1200 / 1200–1500 / 1500–1800 / 1800–2200 / 2200+`. Selecting a range updates
the move list and result bars to reflect what that rating cohort actually plays.
Default is the user's own rating range if known (from the Personal Opening
Explorer), otherwise 1500–1800.

**Who it's for.** Anyone using the explorer to decide _what to play_. Knowing
that 1200s respond with a particular move 60% of the time is far more useful
than knowing what Carlsen does.

**Complexity.** **S–M.** The Lichess Opening Explorer API supports a `ratings`
parameter. This is a runtime client-side fetch per FEN, with a short cache. The
cost is mostly: deciding how to integrate this with the existing pre-built
popularity-stats JSON (live calls vs. swap), respecting rate limits, and
designing the toggle.

**Benefit.** **H.** This is the highest-leverage information change we can make
to the explorer. It directly makes the data more actionable for the target
audience.

**Risks & open questions.**

- Rate limits on the public Lichess API. Caching aggressively (10–60 min)
  client-side handles most of it; if not, fall back to a Vercel Function that
  caches at the edge.
- Slight UX friction: the user has to actively pick a rating; many won't. Smart
  default + remember-the-pick are essential.

---

### 5. Spaced repetition on practice mode

**What it is.** A scheduling layer on top of the existing practice mode, turning
one-off practice sessions into a returning study habit. After practising an
opening, the user can save it to a "Review queue"; an interval-based scheduler
decides when to resurface it.

**How it works for a user.** At the end of any practice session, a "Save for
review" prompt. The opening enters a personal queue. A new "Review" page (or
section on the home page) shows what's due today — "5 openings due, ~10
minutes". Clicking a due item drops the user into the existing practice flow. A
successful run pushes the next review out (1d → 3d → 7d → 21d → 60d); a failed
run resets to 1d.

**Who it's for.** Returning users specifically. This is the feature that turns
an exploration tool into a study tool.

**Complexity.** **M.** The hard part — move validation, hints, feedback —
already exists in practice mode. The new work is: queue state model
(localStorage), interval scheduler, review dashboard, and a few hooks into the
existing practice flow. No backend needed.

**Benefit.** **H.** Closes the most important loop the product is missing.
Chessable's entire moat is this feature.

**Risks & open questions.**

- localStorage-only means the queue is per-browser. Acceptable for v1;
  cross-device sync is the killer reason a user would later opt into auth.
- Algorithm choice: simple interval doubling vs. a real SM-2 / FSRS
  implementation. Simple is fine for v1; the literature favours FSRS but the
  gain is marginal at this scale.

---

### 6. Opening → middlegame bridge ("Plans" depth)

**What it is.** Strengthen the existing Plans tab so it concretely answers "what
do I do _after_ the opening?" — the most common complaint from club players.
Adds 3–5 explicit middlegame plans per major opening, with the key pawn breaks,
piece manoeuvres, and typical themes, generated through the existing LLM
enrichment pipeline.

**How it works for a user.** The Plans tab on an opening detail page displays
bullet-form themes for each side, with miniature board diagrams showing the
typical structure. Each plan links (where possible) to a relevant existing video
or study chapter that demonstrates it. The emphasis is on _patterns_ ("minority
attack on the queenside", "rook lift via the third rank"), not specific move
sequences.

**Who it's for.** Intermediate players (1200–1800) who have learned the opening
moves but don't know what the resulting position is _about_.

**Complexity.** **M.** Pipeline work to extend the existing Gemini enrichment
with a structured plans prompt; storage in `openings.json`; human review of the
generated content before deploy. The frontend work is small (Plans tab already
exists in some form).

**Benefit.** **H.** This is what turns "I memorised an opening" into "I
understand it". Strategic differentiator vs. every other free tool — nobody
addresses the opening-to-middlegame transition for free.

**Risks & open questions.**

- LLM accuracy is better for positional themes than for factual claims, but
  validation is still essential. Spot-check 30–50 openings before deploying to
  all 12,000.
- Long-tail openings will produce generic content. Filter by minimum game-count
  threshold; show Plans only where the data supports it.

---

### 7. Mistake / book-deviation trainer (TASK005)

**What it is.** Already on the roadmap as TASK005. Combines the existing
Personal Opening Explorer (which ingests your real games) with Stockfish
analysis to identify the moves where you deviated from theory or made an
objective blunder, then drops you into a practice session at that exact
position.

**How it works for a user.** From the Analyse dashboard, a "Train your mistakes"
entry point. The user sees a list of recent games with detected deviations or
blunders, clusters them by opening, and drills the positions one at a time using
practice mode.

**Who it's for.** Returning users with personal game data. Closes the loop
between what the user actually plays and what the explorer knows.

**Complexity.** **L.** Stockfish in the browser is feasible (WASM, used
elsewhere) but performance and UX work is significant. The deviation detection
(comparing user moves to theory) is the more interesting half and largely
independent of the engine work.

**Benefit.** **H.** No competitor does this in its full form. It is the reason a
casual user would come back daily.

**Risks & open questions.**

- Two-feature framing matters: "book deviation" (you left theory) is more
  pedagogically valuable than "Stockfish blunder". Treat them as two distinct
  training modes, not one fused thing.
- Engine-in-browser cost: not free in CPU/battery on mobile; consider
  server-side fallback for low-power devices.

---

### 8. Opening trap library

**What it is.** A curated set of the dirty traps and gotchas sub-1800 players
actually lose to (Fishing Pole, Légal's mate, the Lasker trap, the Englund
swindle, etc.) — searchable by opening, by attacker/defender, and by "what
should I know to not fall for this".

**How it works for a user.** A dedicated `/traps` page with browseable cards.
Each trap has the move sequence, a board replayer, the "trap move" clearly
marked, _both_ sides of the lesson ("how to spring it" / "how to avoid it"), and
links to any opening pages where it appears. From an opening detail page, a
"Known traps in this line" callout when relevant.

**Who it's for.** Sub-1500 players _heavily_. This is the demographic that loses
200 rating points to the same five traps.

**Complexity.** **M.** Mostly content work — curating ~50 high-value traps with
PGN, captions, and relevance metadata. Frontend is a new page plus a small
callout component. No new infrastructure.

**Benefit.** **M–H.** High emotional and practical value for the target
audience; very shareable; zero competitive overlap (no major free site does this
well). Might also become a viral entry point — "the 10 traps every 1200 falls
for" is the kind of post that gets links.

**Risks & open questions.**

- Curation is the work. 50 traps × 30 minutes each = a real time investment, but
  most of it can be one-off and never touched again.
- Where does it live in the IA? Probably its own top-level nav item ("Traps") is
  over-promoting; a section under a broader "Learn" nav item is right.

---

### 9. Side-by-side opening compare

**What it is.** A compare page where the user picks two openings (e.g. "Italian
vs. Ruy Lopez") and sees them side by side: stats, popularity, theory depth,
sample lines, and the user's personal score in each. Decision support for "which
should I actually play?"

**How it works for a user.** From any opening detail page, a "Compare with..."
control. The user picks a second opening from a typeahead. Both openings render
in two columns: same key data points stacked vertically, with deltas highlighted
(Italian has 2.3× the resources; Ruy Lopez has deeper theory but your personal
score is 8% higher). A direct CTA to add the winning choice to the user's
repertoire.

**Who it's for.** Players actively shopping for a new opening to learn — a
common moment, especially after a string of losses with their current choice.

**Complexity.** **S–M.** All the data exists; the work is a new page, a
column-renderer, and a typeahead picker. Personal stats only render if the user
has linked their Chess.com / Lichess account (gracefully omit otherwise).

**Benefit.** **M.** Moderate as a standalone feature, but it's the kind of thing
that gets shared (compare links are inherently shareable URLs) and makes the
"shopping for an opening" flow concrete. Also relatively cheap.

**Risks & open questions.**

- Two-column layouts on mobile are always painful. Stack vertically on small
  screens with a sticky tabbed switcher between A and B.
- Deciding which data points to compare (and in what order) is the actual design
  challenge. Strong opinions here outperform 14 attributes laid out flat.

---

### 10. "What should I learn next?" recommender

**What it is.** A personalised recommendation card on the Analyse dashboard that
points at the highest-leverage opening to study, derived from the user's actual
game data. Not a generic "popular openings" list — a specific, evidence-based
suggestion.

**How it works for a user.** On the Analyse dashboard, a card titled "Your next
study target". The card names one opening, explains _why_ in one sentence ("You
face the French 18% of the time as White and score 38% — this is your largest
single source of losses"), and offers two CTAs: "See this opening" and "Add to
repertoire". Refreshes when the user re-syncs their games.

**Who it's for.** Users who have synced their games and don't know where to
focus. Removes a major decision-paralysis blocker.

**Complexity.** **S.** The math is simple — frequency × score gap from expected.
Wires into existing personal stats. Implementing the explanation text is the
main UX challenge ("why this one?"). No infrastructure.

**Benefit.** **M–H.** A small feature that punches above its weight by putting
personalisation _front and centre_ on the page that already has the data. It's
the kind of thing that makes a user say "oh, this product knows me".

**Risks & open questions.**

- Sample size matters; with <20 games, recommendations will be noisy. Show the
  card only above a threshold; below it, show "Play more games to get
  personalised recommendations".
- The recommendation should rotate when followed (don't keep recommending the
  same opening forever) — needs a "I'm working on this" / "snooze" control.

---

### 11. Repertoire sharing link

**What it is.** A public, read-only URL of any user's saved repertoire, so they
can link friends, coaches, or social posts to "what I'm currently playing". URL
is the identity — no account required.

**How it works for a user.** From the Repertoire page, a "Share" button
generates a URL like `openingbook.xyz/r/abc123def`. The URL renders the
repertoire as a public read-only page: list of openings, family rollups,
optional notes per line. The owner sees an "edit mode" version when they visit
the URL on the same browser; everyone else sees read-only. Optional "hide my
notes" toggle for embarrassing personal annotations.

**Who it's for.** Two audiences: (a) users with a coach or chess club ("here's
what I'm working on"), and (b) anyone naturally inclined to share. Also a quiet
acquisition channel — every shared link is a referral.

**Complexity.** **M.** Needs a write-and-read endpoint, persistent storage keyed
by a random ID, and the read-only render. The same backend choice as the
community-signal feature (KV / Postgres / Blob via Function). If
community-signal is being built anyway, this rides on the same infrastructure
for almost free.

**Benefit.** **M.** Moderate as a feature in isolation, but valuable as a social
loop and as the migration path toward optional accounts later (an account
becomes "claim my shared repertoire URL").

**Risks & open questions.**

- URL collision / security: random IDs need to be unguessable. 12 chars base62
  is fine.
- Stale data: the shared URL reflects the repertoire at the time of share.
  Decision: snapshot vs. live (live is better, but ties the share-link to the
  user's localStorage — solved by syncing to backend at share time).

---

### 12. Daily opening puzzle

**What it is.** One position per day — drawn from a popular opening or, if the
user has a repertoire, from their own lines — with a single question: what's the
book move? A small daily-return habit hook, in the spirit of chess.com's daily
puzzle but framed around theory rather than tactics.

**How it works for a user.** A "Daily" entry point on the home page or in the
nav. Click to load today's position. The user makes a move; instant feedback
("yes, that's the most popular reply", "no — this line is rare, the main move is
X"). Streak counter for consecutive days. Optional email reminder (later — needs
minimal account).

**Who it's for.** Returning users; specifically the habit-forming
"give-me-a-reason-to-come-back" lever that no other feature provides directly.

**Complexity.** **S–M.** Position selection is straightforward (FEN + expected
move from the existing data). UI is one page. Streak tracking is localStorage.
Email reminders are a later add-on.

**Benefit.** **M.** Won't transform the product, but it's a cheap and proven
habit hook in the chess space. Pairs naturally with spaced repetition (#5) — a
user who's already returning daily for puzzles will naturally adopt SR.

**Risks & open questions.**

- Position selection algorithm: random vs. weighted by user's repertoire vs.
  curated. Curated is highest-quality; random is laziest. Probably weighted by
  repertoire when one exists, fall back to a curated rotation otherwise.
- "What counts as the right answer" needs nuance — many positions have multiple
  valid book moves. Allow any move that appears with >5% frequency in the data.

---

## Prioritisation

Ranking by **benefit ÷ complexity** with strategic considerations layered on
top.

| Rank | Feature                               | Benefit | Complexity | Why now                                                                                                                                         |
| ---- | ------------------------------------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Opening family rollups (#2)           | H       | M          | Best return on a single workstream. Fixes a real Analyse usability problem, improves search, and lays groundwork for any future grouping logic. |
| 2    | Rating-contextualised stats (#4)      | H       | S–M        | Highest information-value change to the core explorer. One API integration, one UI control. Genuinely makes the existing data more actionable.  |
| 3    | Spaced repetition (#5)                | H       | M          | Closes the learning loop. Practice mode is currently underused because there's no scheduling layer; this fixes that without any backend work.   |
| 4    | "Next study target" recommender (#10) | M–H     | S          | Cheap personalisation win. Uses data we already have, makes the Analyse page feel intelligent, no new infrastructure.                           |
| 5    | Opening → middlegame bridge (#6)      | H       | M          | High user value once it ships, but pipeline + LLM review is real work. Sequence after the smaller wins so the loop is in place when this lands. |
| 6    | Mistake trainer (#7 / TASK005)        | H       | L          | Strategically central but expensive. Worth elevating once the prerequisites (recommender data, family rollups) are stable.                      |
| 7    | Master / FIDE games tab (#1)          | M       | M          | Nice depth feature, modest learning impact. Ship after the learning-loop features land.                                                         |
| 8    | Opening trap library (#8)             | M–H     | M          | High target-audience value but content-heavy. A good "side project" feature — can be built incrementally over time.                             |
| 9    | Side-by-side compare (#9)             | M       | S–M        | Pleasant to have; not a retention driver. Ship if cheap, defer if not.                                                                          |
| 10   | Daily opening puzzle (#12)            | M       | S–M        | Decent habit hook but most valuable when SR is already in place. Stack behind #3.                                                               |
| 11   | Community signal (#3)                 | M       | L          | Real infrastructure decision. Defer until something forces us to add a write-path backend (likely #11, repertoire sharing).                     |
| 12   | Repertoire sharing (#11)              | M       | M          | Couples to backend work; ship alongside or just after community signal so both pay for the same infrastructure.                                 |

**Suggested first three to take to spec:** Family rollups, Rating-contextualised
stats, Spaced repetition. They cover an analytical-depth win, a data-quality
win, and a retention win respectively — three different value vectors, with no
shared dependencies, so they can ship in parallel or sequence flexibly.

---

## Monetisation hooks

Per the constraint, only tip jar (A) and affiliate / partnership (D) are on the
table. Account-gated tiers are explicitly out.

### Tip jar — placement and trigger moments

A persistent but quiet "Support OpeningBook" link in the footer is the floor.
Higher-yield placements are _moments of demonstrated value_ — when the user has
just received something useful, ask gently:

- After a successful spaced-repetition review run (`#5`): "Nice streak — if this
  is helping, you can support the project here."
- On the Analyse dashboard once a recommendation has been followed (`#10`):
  "OpeningBook is free. If it's helped your game, ☕".
- On the daily puzzle streak milestone (`#12`): every 30-day streak prompts
  once.

The rule: never ask before the user has received value, never ask twice in the
same session, never gate anything.

### Affiliate / partnership — natural placements

- **Chessable / Chessly course links** on opening detail pages, marked as
  partner links. Already partly in place (the Chessable search link). Make it
  explicit: under each major opening, a "Recommended courses" rail that is
  honestly relevant — not noise. Partner attribution clearly labelled.
- **Books** — for openings with classic books (e.g. _Play the Najdorf_), a small
  "Further reading" callout with affiliate links. Low volume, high trust.
- **Coaching** — once the recommender (#10) identifies a user's biggest
  weakness, an opt-in "Book a session with a coach who specialises in this" link
  to a partner coaching marketplace. Only shown on explicit interaction (a user
  clicks "I want help with this"), never proactively.
- **Hardware / sets** — low fit; skip.

### What this is _not_

- No "premium tier" or paywalled features. If a feature ships, it ships free.
- No dark patterns: no "upgrade to remove ads", no nag screens.
- No data sale, ever. The personal-game-data feature is too sensitive to
  monetise even consensually; it stays the user's.
- No coercive auth. If accounts ever appear, the trade is "you get sync /
  sharing", not "you get the features you already had".

The combined ceiling of A + D is modest — realistically tens to low hundreds of
pounds per month at current scale, scaling roughly linearly with traffic. That's
a feature, not a bug: the model is sustainable, not extractive, and matches the
product's positioning as "the free thing that doesn't try to sell you anything".

---

## Parked / out of scope

Features considered and deliberately left off the main list, with brief
reasoning so future-us doesn't relitigate.

- **Cloud-synced repertoire.** Requires mandatory auth, contradicts the "auth
  optional" constraint. Revisit only if a sharing or coaching feature creates
  clear demand.
- **Voice / commute-mode practice.** Genuinely interesting but niche, with
  significant accessibility-and-correctness work for a minority of users.
- **Discord / dedicated community hub.** High moderation cost, low chess
  improvement payoff, and the "community" need is partly served by the community
  signal feature (#3) at a fraction of the cost.
- **Tournament-prep "scout my opponent" tool.** Actually a great feature, but
  it's really a separate product targeted at a different (more competitive)
  user. Revisit as a spinoff, not a feature.
- **In-house Stockfish on every page.** Engine-in-browser everywhere is
  expensive in CPU/battery and overkill for an opening tool. Use Stockfish
  inside the mistake trainer (#7), not as a global feature.
- **AI chat ("ask the opening anything").** LLM-as-tutor is tempting but current
  models are unreliable on chess specifics and the AD-005 policy rightly limits
  what we publish. Wait for grounded retrieval over our own curated data before
  considering.
- **Mobile apps (native).** Web is doing the job. Native is a 10× cost for a
  1.2× experience improvement at this stage.

---

## Related work

- [TASK005] Stockfish Analysis & Blunder Detection (Pending) — corresponds to
  Feature 7 above.
- [TASK010] Local Repertoire (Done) — Feature 11 (sharing) extends this.
- [TASK012] Video Pipeline (Done) — Feature 3 (community signal) layers on top.

---

## Next steps

Pick one feature from the top three (Family rollups, Rating-contextualised
stats, Spaced repetition) to take through `superpowers:brainstorming` again for
a full design, then through `superpowers:writing-plans` for an implementation
plan.

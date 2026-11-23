# 05 — Your games

Night 5, the second unit of the 2026-11-23 extra run (~14:00 UTC). Per
`operating.md`, the reading was done by a fresh subagent that returned a brief;
this file is written from it. Method: the deviation-trainer PRD, the shipped
Analyse code, the backlog and memory bank, issues #195 and #207; nine product
and coaching pages fetched (Aimchess, Chessbook, OpeningTree, a ChessAtlas
listing, three Chess.com blogs, Chess.com's Explore-tab announcement, a
Substack), plus three searches. **Refused or unread:** every `lichess.org` page
(HollowLeaf's and ChessAtlas's posts appeared only in search results);
OpeningTree returned only its title (a JS app); no Chess.com Insights page was
read. Competitor claims are from their own marketing pages, not hands-on.

The question, from the plan: the deviation-trainer PRD, what shipped from slice
1 and why slice 2 never started; how others connect games to study.

## 1. What we planned and what shipped

- **The PRD** (`docs/proposals/2026-07-11-deviation-trainer-prd.md`, v4) aims
  to be "the only free tool that finds where your opening play breaks down in
  your own games, proves it matters… and hands you the drill", for club players
  (~800–1800) who will not pay for Chessable.
- **Slice 1 (evidence engine) shipped 2026-07-13 (#50)** as the band-aware
  explorer behind `/api/explorer` and the sidebar level lens. The level-check
  strip and the Analyse bridge card were cut.
- **Slice 2 (deviation trainer) never started.** It would flag where the
  _user_ left book while book was still available, only if it recurs (≥2 games),
  show the user's own record as counts ("stayed in theory: 4W 1L; left at move
  6: 1W 6L"), and end in "Drill the theory line" →
  `/opening/{fen}?practice={colour}`. Slice 3 (spaced repetition) is parked
  until accounts are justified, and accounts wait on slice 2 showing retention.
- **Why it stalled:** no recorded reason beyond sequencing. `docs/backlog.md`
  (rev 4) notes "never started: no detection code, no `?practice=` parameter"
  and re-ordered the work as credibility → loop → trainer → platform, putting
  it behind the P0s. The 2026-10-27 competitive review that #195/#207 cite is
  not in the repo.
- **What a learner can do today** (`AnalyseGamesPage.tsx`,
  `components/personal/`, `shared/src/utils/personal-analysis.ts`): type a
  Lichess or Chess.com username (no account here); the API fetches up to 500
  rated games (10-minute cache); the client classifies them against the search
  index and shows W/D/L per opening and family, cached in sessionStorage. Each
  row links to `/opening/{fen}?ref=personal&platform=…&username=…` — and the
  detail page ignores those parameters (night 1 found the same).
- **Use:** `/analyse` 24 views by 15 people in a month (`baseline.md`).

## 2. How others join games to study

| Product | With your games | Account / price | Then |
| --- | --- | --- | --- |
| [Aimchess](https://aimchess.com/) | Opening performance; "Opening Improver" revisits where you went wrong | Signup; free = one 40-game report a month, $7.99/mo | Lesson, weekly plan, retry |
| [Chessbook](https://chessbook.com/) | "Instant feedback when you play the wrong move" vs your repertoire | No signup for the free 200-move tier; $7/mo | Spaced repetition, model games |
| ChessAtlas ([listing](https://mwm.ai/apps/chess-openings-chessatlas/6770867404)) | "The first move where you deviated" from your repertoire | Free to start, premium | ~20 positions a day, streaks |
| [Chessalyz](https://www.chess.com/blog/MattyDPerrine/chessalyz-june-update-see-the-moment-your-game-leaves-your-prep) | Explorer of your games; marks where you left prep | Account; paid for full history | Add lines, flashcards |
| [Chess Lens](https://www.chess.com/blog/yarrichar/chess-repertoire-tool) | Weekly per-opening W/D/L, repertoire deviations | Free beta | Practice tab |
| [Chess.com Explore tab](https://www.chess.com/news/view/announcing-explore-tab) | Your games as the explorer database | Chess.com account | Spot weak openings |
| HollowLeaf Repertoire Builder | Opening tree from Lichess/Chess.com/PGN | Free (search summary only) | Repertoire drill |

**The pattern:** every one compares your games against **a repertoire you built
first**, and every paid one ends in a spaced-repetition drill. "Where you left
book" is common now (night 2 already corrected "only free site"); what is not
common is doing it with no repertoire to build and no account, against a book
of every named position.

## 3. The disagreeing source

IM Junta Ikeda, [Chess.com blog](https://www.chess.com/blog/nekochabo/why-opening-study-isnt-making-you-better),
on players 1000–1500: "Your opponents won't punish you for not knowing theory –
they'll punish you for hanging pieces and allowing tactics", and "for amateur
players, openings should take up no more than 10 or 20% of your time on chess."
He argues for less opening time, not none. The common "don't study openings
below 1500" rule appears only as folk advice
([Chess Chatter](https://chesschatter.substack.com/p/should-beginners-study-chess-openings),
which rebuts it). Nothing read on either side has data.

## What this means for us

1. **Own games are a strong second step, not a first one.** Fifteen people a
   month use Analyse; 117 land on opening pages. A games feature serves the few
   who already want it. Its best role in this experiment is as the _reason a
   unit is personal_ — "you left this line at move 6 in 4 games" — and as the
   second visit's hook, not as the front door.
2. **Our edge is "no repertoire to build".** Competitors need one before they
   can say where you deviated. We can measure deviation against the whole
   opening book, with the PRD's noise rules (user moved, book still available,
   recurs ≥2). That is real and worth keeping for the slice plan.
3. **The cheapest seam is #195, and it needs no detection code.** Read
   `?ref=personal` on the detail page, show the real counts strip, and add a
   public `?practice=white|black` that opens Practice in the player's colour.
   That joins Analyse → opening page → drill in three small changes, and
   `?practice=` is exactly what a study unit's "play the line" step needs too.
4. **Keep it small (Ikeda).** One leak per opening, one short drill, counts not
   percentages. A unit that takes ten minutes respects a 10–20% opening budget;
   a report that asks for an hour does not.
5. **Gate A shape after nights 3–5:** a _study unit_ for one opening family —
   the video beside the board, the key positions with "what your level plays
   here", Practice with the night-4 fixes, a memory of attempts (#196) — with
   #195's `?practice=` as the shared seam and own games as an optional
   personal layer (#195 strip first, slice 2 detection later). Alternatives for
   Gate A to weigh and turn down: the deviation trainer first (small audience),
   the 31-family written book (content cost), Practice fixes alone (no return).

## The critic's case, answered

A fresh subagent argued against this note; shortened objections and answers.

1. **Item 5 is a bundle the traffic cannot judge.** Accepted. Gate A must name
   a one-part first slice and judge each slice by the owner and testers, not
   analytics. The order that follows from nights 4–5: `?practice=` + the
   Practice fixes, then attempt memory (#196), then the unit around them.
2. **"Games are the second visit's hook" is unbacked.** Accepted; it is
   withdrawn as a claim. Own games stay an optional layer, and the return hook
   Gate A proposes is #196's memory of attempts, which needs no username.
3. **"No repertoire to build" overreaches.** Partly. It rests on marketing
   pages and on name matching being right; and the PRD's ≥2-recurrence rule
   will flag few leaks for many players. It stays a possible edge to test, not
   a stated one, and it is not in the first slices.
4. **The #195 strip has nothing to show after a reload or a shared link.**
   True: the counts live in sessionStorage. The strip must render only with
   real counts in hand and otherwise show #195's fallback line — the
   fabricated-data rule. `?practice=` does not depend on it and ships alone.
5. **Why is the backlog's ranking wrong now?** It is not overturned: the backlog
   puts "loop" before "trainer", and the first slices here are loop work
   (`?practice=`, Practice fixes, #196). The trainer stays behind them.
6. **The cheaper probe — a return prompt with no games — was dismissed, not
   argued.** Fair. "Practice fixes alone" was turned down for giving no reason
   to return; Practice fixes **plus #196** is that cheap probe, and it becomes
   the first slice.
7. **The baseline numbers may be inflated by the unexplained spike.** Yes; the
   15 and 117 figures carry that caveat (`baseline.md`). The direction —
   many more land on opening pages than use Analyse — holds either way.

**After the critic:** own games leave the Gate A recommendation as a core part
and stay a later, optional layer. The recommendation Gate A will argue: first
slice `?practice=` + Practice fixes + #196's memory; then one family unit as
the Gate B prototype.

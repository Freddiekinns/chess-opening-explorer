# 01 — The learner's journey today

Night 1, 2026-11-22. Method: the code on `main` (`a8b0f6f`) and the data in
`api/data/`. **The production site was unreachable from the cloud sandbox** (the
proxy refused `openingbook.xyz`), so nothing here was clicked through live; the
order and contents of each page are read from `OpeningDetailPage.tsx`,
`LandingPage.tsx` and the API's `/page/:fen` route. Check against a real phone
before relying on any claim about what is above the fold.

## What a visit offers

- **Home** (`/`): hero, search ("Search variations, ECO codes, or systems…"),
  the visitor's starred openings (`RepertoireSection`), popular openings grid.
- **Opening page** (`/opening/:fen`), mobile order: board and move controls →
  overview text (clamped, "Read more") → explorer surface (level bands, move
  stats, tree) → master games (collapsed) → **Common plans** → Learning
  resources (videos, studies, search links). Desktop puts plans and resources
  full-width below the board/explorer grid.
- **Practice**: replays the moves _up to this position_ (`getMovesList`) as the
  chosen colour. One line, the one you are already looking at. Nothing is
  remembered afterwards: no record of which lines you have drilled, no next line
  to try.
- **Star / repertoire**: a local list of starred positions, shown on home.
- **Analyse games** (`/analyse`): pulls a Chess.com or Lichess username's games
  and lists the openings played, each linking to its page with
  `?ref=personal&platform=…&username=…`. **The opening page never reads those
  parameters**, so the learner arrives on the same generic page anyone else gets:
  nothing says "you have played this 14 times, scored 35%, and left book at move
  6".
- Data depth: all 12,377 positions have an LLM description and `common_plans`
  (2–5 one-sentence bullets, e.g. "White: Play Qe2 followed by Rd1…"). Plans are
  prose with move names in them but no board positions; nothing links a plan to
  the line where it happens.

## Learner 1 — beginner who just lost to the London

Arrives from Google or the home page and searches "London". 48 positions carry
"London" in the name. The plain name "London System" belongs to 1.d4 Nf6 2.Nf3
g6 3.Bf4 (A48); the line they most likely faced (1.d4 d5 2.Bf4) is "Queen's Pawn
Game: Accelerated London System", or a "London System Main Base Position with
...d5" record. Ranking is the `search-ranking` skill's job and not audited
tonight; the point is the learner has to choose among names that do not say
"what do I play against this".

**Value:** the explorer shows what Black plays most and how it scores at their
rating band — genuinely useful, and the band selector is the most-used event
(`band_select` 40). Plans give a paragraph of ideas.

**Leaves because:** their question is "how do I beat it" from Black's side, and
the page is written about the opening, not for the person facing it. There is no
"recommended reply, here is why, here is the trap to avoid", no practice from
Black's side of _a good line_ (practice only replays the moves already on the
board), and the videos are below a screen of explorer data. One glance, no
reason to come back.

## Learner 2 — club player, King's Indian, plays it inconsistently

115 KID positions. They can walk the tree move by move, see stats by band, star
positions, and read plans per variation (the Orthodox plans are good: ...f5
break, b4–c5, closed centre). Practice drills the line to the current node.

**Value:** the most of any learner. The tree plus band stats is what they would
otherwise get from Lichess's explorer, with prose on top.

**Leaves because:** "inconsistently" means they do not know _which_ lines they
get wrong, and the site cannot tell them. `/analyse` can list their games, but
the opening page drops that context on arrival, so their games and the book
never meet. Their starred list is a bookmark list, not a repertoire with gaps or
a drill queue. Nothing changes between their visits, so there is no reason to
return tomorrow rather than next month.

## Learner 3 — from Google on an obscure named line

E.g. "Smith-Morra Gambit Accepted, Chicago Defense" (B21). This is the
search-traffic case (`baseline.md`: Google sends people to obscure named lines;
SEO pages are most of the 201 opening pageviews).

**Value:** a page exists, with a real description, two plans and real move
stats. Families mean a video shelf appears even when the line has no videos of
its own.

**Leaves because:** the page answers "what is this" in a paragraph, which is the
whole of their query. Nothing pulls them one step further: no "you are here in
the Smith-Morra; the main line is…; the three things to know", no route from the
leaf back to a chapter. The back link goes home. Median session 0 s fits this
exactly: the query is answered or not in the first screen.

## Patterns across the three

1. **The site is a reference, not a lesson.** Every page describes a position;
   none teaches a sequence (what to play, why, what to watch for, then drill it).
   A learner has nothing to _finish_, so a visit has no length.
2. **Nothing persists that would bring someone back.** Starred positions, recent
   openings and watched videos live in `localStorage` and change nothing about
   the next visit. No drill queue, no progress, no "you were last here".
3. **Their games and the book are one hop apart and never meet.** `/analyse` has
   the games and already links into the book with the username in the URL; the
   book ignores it. This is the cheapest seam on the site to join, and possibly
   the most distinctive (the charter's third starting point).
4. **Practice is the only activity, and it is shallow.** 13 started, 5 finished:
   it drills the move sequence you are already looking at, once.
5. **Plans are text without positions.** The free-book idea needs plans tied to
   moves and boards, not bullets beside them. Night 4's question.
6. **Videos are at the bottom.** Consistent with `baseline.md`: 7 of 20 who saw
   a gallery clicked, so "below a screen of data" may be the problem rather than
   the videos. Night 3's question.

## For Gate A (not a recommendation yet)

Candidate shapes this night points at, to be tested by nights 2–5:

- **Chapter mode**: a guided path through a family (main line → key ideas at
  each move → drill), built from tree + plans + stats already held.
- **Your games in the book**: honour `ref=personal`, show the learner's own
  record and where they left book on the page, and queue the lines they lose.
- **A drill that remembers**: practice that keeps a per-line record and offers
  the next line due (spaced repetition, Chessable-style), local first.

Unverified: everything about fold position and real mobile layout; search
ranking for "london"; whether `/analyse` users ever click through to a page (no
event for it in the baseline).

# 04 — What the free chess book needs

Night 4, run as an extra run on 2026-11-23 (~13:55 UTC) at the owner's request.
Method: our own data profiled in the container (`api/data/eco/*`, the content
ledger, families, courses); the common-plans issues and PRs read (#228–236);
Practice played on production at 390 px (screenshots in `gates/night4/`); 12
primary pages read (three Wikibooks pages, Chess.com's Italian Game page, a
Move by Move sample extract read as text, Chessbook's site, two Chess.com
articles and a blog on how to study openings, the Chassy & Gobet paper on
opening knowledge, plus two searches to find them). **Refused:** `lichess.org`
(403), `chessable.com` (403), `chess.stackexchange.com` and `reddit.com`
(fetch tool refuses), a Brunel paper (503), a CORE paper (403).

The question, from the plan: the common plans as they stand, what a real
opening book chapter has that a plan list lacks, and what we can build from data
we already hold without a new pipeline. Plus night 3's open item: where does
Practice lose people (13 started, 5 finished)?

## 1. What our "book" is today (measured)

Every one of the 12,377 positions carries the same generated block
(`analysis_json`, enriched 2025-07):

- **An overview**, median 70 words, and **four common plans**, median 21 words
  each ("White: Prepare and execute the d2-d4 pawn break to open the center…").
  Every position has plans; none is empty.
- **`strategic_themes`** on every position (e.g. "Pressure on the f7 square")
  — **not rendered anywhere** in the web app. `books` (LLM book recommendations)
  on 157 positions — also not rendered, and unverified; it must stay that way
  unless checked (fabricated-data rule).
- **Reviewed: 205 of 12,377 pages (1.7%)** in `data/content-review/ledger.json`;
  67 of those needed a fix (33%), 137 were fine. #233's checker found 4,216 plan
  references that fail a legality check, on 3,299 pages.
- The work in flight (#230 diagram beside the plans, #235 clickable references,
  #236 the overnight fixes) makes the plan list **readable** — the position in
  view, the squares drawable. It does not change what the list **is**: four
  21-word assertions per page, written for 12,377 pages at once.

Around the plans, the page already holds real data a book does not: move shares
per rating band (`/api/explorer`), over-the-board master games (top games from
the Lichess masters explorer — they link out, they do not play on our board),
videos, 4,500 Lichess study chapters (`courses.json`), 31 families with a short
description, and style tags.

## 2. What a real opening chapter has (sources)

- **Move by Move** (Everyman; the 1…b6 extract, read as text): the series
  "uses a question-and-answer format… to replicate… lessons between chess
  teachers and students". A chapter is **complete illustrative games**, annotated
  move by move, with **key positions** as diagrams ("This is our key position
  from the first chapter"), **questions the reader is asked** mid-game
  ("Question: …What is his idea?" then "Answer: …") and **exercises**
  ("Exercise (combination alert): Black's last move overlooked a tactic. White to
  play…"). The introduction tours the four or five battleground positions before
  any theory. Lakdawala's own warning: "we harbour the false belief that we
  understand the line, simply because we memorized key variations of it."
- **Wikibooks, Chess Opening Theory** — the free chess book that already
  exists. The 3.Bc4 page is a real chapter: why each reply is played ("3…h6 is
  strictly inferior to 3…Bc5"), a theory table, history, links down the tree.
  But the whole book marks itself "50% developed", many table links "do not
  exist", and a deep Najdorf page is ~150 words opening with "This is the best
  move." Lichess pulls this text into its explorer by move order (a Wikibooks
  editor's forum report; the Lichess page itself was refused, so unverified).
  **So "a free chess book that does not exist elsewhere" is wrong as stated** —
  it exists, is good at the top of the tree and thin below it, and is shown
  where Lichess users already study.
- **Chess.com's Italian Game page**: intro, why the first moves, three variations
  with short rationales, win rates, history, three famous game titles (no
  moves, no notes) and a "30-minute lesson with 10 challenges" promo. Its prose
  is longer than ours but has the same shape: reference, then a paid exercise.
- **Chessbook** (free tier, 200 moves, no account needed to start): "See how
  masters handle the openings you play and 'guess the move' as you go" — model
  games made active, plus spaced repetition and a check of your online games.
- **How coaches say to study an opening** (Gserper, Chess.com; PolishDavidd's
  blog; a Chess.com intermediate study plan): principles first, then **model
  games** ("you cannot fully understand an opening without classical games"),
  then **pawn structures** that "dictate the plans", and only roughly **7–10
  moves** of theory for an intermediate player. "If there are 5 or more good
  moves, it is usually better to focus on ideas instead of theory."
- **The disagreeing source, checked: Chassy & Gobet (PLoS ONE 2011).** Opening
  knowledge is rote ("monochrestic") and its depth tracks rating almost exactly:
  Class B players know ~14 ply of theory, masters ~18 (a linear fit explaining
  99% of the variance in class means). So moves _do_ matter and are learnt by
  rote — but the difference between a club player and a master is only ~4 ply.
  Our median named line is 11 ply (quartiles 8 and 15), already inside what a
  club player holds. The gap a book fills for our learners is not more moves;
  it is knowing what to do when the moves run out.

**What a chapter has that a plan list lacks**, then: (1) a tour of a few key
positions before any detail; (2) the plans shown _happening_ in whole games, not
asserted; (3) questions that make the reader find the move or the idea before
being told; (4) the why of each main-line move; (5) exercises and typical
mistakes. Ours has none of the five. It has one thing no book has: what players
at your level actually play in each position.

## 3. Practice, played (seen)

Production, the Italian Game at 390 px (`gates/night4/`):

- **Practice starts in place**, board on screen, "Move 1/5", Hint and Exit.
  Good.
- **A wrong move does nothing.** Playing 1.d4 instead of 1.e4: the piece goes
  back, the counter stays, no message — no "not the book move", no "the line
  plays 1.e4 because…" (`practice-wrong-move-phone.png`). After two misses the
  hint highlights the piece (`handleIncorrectMove`), still without a word.
- **The drill's extension can teach a dubious line.** The named line is 5 ply;
  Practice extends short lines with the most-played named child
  (`pickBest`, by games played at all ratings). On the Italian it went 3…Nf6
  4.Nc3 Nxe4 — White is drilled into allowing the fork trick, a line most
  coaching material steers White away from (`practice-complete-phone.png`). The
  mobile counter does not show the "incl. book continuation" tag desktop has.
  One page checked; how often popularity picks such a line is unmeasured.
- **The end is "Complete!" and nothing else**: no record, no next line, no
  "try it as Black", no "come back tomorrow" (#196 is the missing step).

Where the 8 of 13 who started stopped cannot be read from the cloud:
`practice_abandon` carries `{moves, of}`, which answers it exactly. A `[local]`
item. From the code alone, the likeliest leaks are the silent wrong move (a
learner who does not know the line has no way to learn it inside the drill
except Hint) and the drill asking for moves nothing on the page has shown yet.

## What this means for us

1. **The book that is missing is not more text per position; it is a chapter
   per family.** Wikibooks already does per-position text, well at the top and
   thinly below. Rewriting 12,377 plan lists cannot be done without an LLM
   pipeline (charter: no spend without a yes), and the content routine has reviewed
   205 pages since 2026-10-11. But there are **31 families**. A chapter per family —
   three to five key positions, the plans tied to them, one model game, and
   the explorer's "what your level plays here" — is a size the existing content
   routine could write and review, and matches night 3's finding that our videos
   are family lectures. That is an owner decision (it uses the content routine
   or new spend), so it goes to Gate A as a dependency, not a night's build.
2. **What we can build today from data we hold is the questions, not the
   prose.** "At your level, N% of Black players answer here with X — what do you
   play?" (N and X read live from the explorer, never written in) is real data,
   already cached, and is the Move by Move question
   format with our one unique ingredient. Combined with Practice it turns the
   drill from "replay the moves" into "decide at the branch points".
3. **Practice needs three small fixes before any unit leans on it**: say why a
   move is wrong (at least "the line plays …"), show the line before drilling
   it, and choose extensions by the learner's band and not raw popularity — or
   stop extending into lines no one would teach. Each is a bug-sized change.
4. **Plans stay a reference.** #230/#235 are worth finishing (the owner's call,
   in flight), but the experiment should not build on the 12,377 plan lists as
   if they were a book: 33% of reviewed pages needed a fix and 98% are
   unreviewed.
5. **Candidate for Gate A**, refined from night 3: _a study unit per family_ —
   tour the key positions (diagram + plan + what your level plays), watch the
   family video, play the line in Practice with the fixes above, decide at the
   branch points, and see it again later (#196). Built from data we hold; the
   key-position choice and short notes per family (31) need an owner yes on who
   writes them. Weigh against night 5 (own games).

## The critic's case, answered

A fresh subagent argued against this note; its objections, shortened, and the
answers.

1. **A 10–30 minute unit for visitors who leave in 0 seconds.** Fair, and the
   strongest point. The unit is not aimed at the median visitor; it is aimed at
   the 13 who pressed Practice and the 20 who opened a gallery — the people
   already trying to study. Gate A must say so and size the claim to them. A
   unit that also starts with one small step (one key position, one question)
   is a better entry than the full tour; the slice plan should open there.
2. **A Sicilian chapter is a lecture about 1,710 pages.** Agreed: families are
   uneven (82 to 1,710 positions) and 613 positions sit in "irregular" or no
   family. The unit should be per family for the small ones and per main
   branch (Najdorf, Dragon…) for the big four, and a page outside any unit
   shows what it shows today. Whether landing visitors on deep lines want a
   unit at all is the Search Console `[local]` item (lookup or study).
3. **Branch questions rest on live, rate-limited explorer data, and popularity
   is not correctness.** The questions would cover a handful of key positions
   per unit, all CDN-cached by the proxy; that is far fewer fetches than the
   explorer card already makes on every page. The answer to "what do you play?"
   is the line's move, not the popular one; the stat says what you will
   _face_, which is the point. Numbers may drift between visits; the question
   reads them live and never stores them (fabricated-data rule).
4. **Practice evidence is one page.** Accepted. The dubious extension is one
   observation of a mechanism the code confirms; the frequency is unmeasured and
   is now a check for the build, not a claim. The abandon point stays `[local]`.
5. **The cheap fixes alone might be the experiment.** Partly accepted: they go
   first in any slice plan, and `families.json` already names 2–3 popular
   variations per family (`popular_variation_ecos`), so the key-position
   shortlist is partly there and the "who writes it" question is smaller than
   stated — short notes on ~3 positions × 31 families. But three Practice fixes
   do not give anyone a reason to come back; #196 plus a finite unit does.
6. **New authored text has the same trust problem as the plans.** True for
   text; less so for structure. The unit's spine is real data (positions, the
   explorer, the video, the drill); the notes are short and few enough (~100,
   not 41,084) to be reviewed by the owner or the content routine. Model games
   on our own board are a new build and are dropped from the first slice.
7. **No source here is about retention.** Correct — night 2 carries the return
   argument, and at 30–50 people a week only the owner and testers can judge.
   Gate A will say the measure is the owner's and testers' sessions, with
   analytics as a sanity check (`baseline.md`).

**After the critic:** the candidate shrinks. First slice: the three Practice
fixes and #196's memory; then one unit for one family as the prototype for Gate
B. The full 31-family book is not proposed for this experiment.

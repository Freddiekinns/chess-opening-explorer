# 02 — How others teach openings

Night 2, 2026-11-23 (run Monday ~13:20 UTC, before the weekly reset, at the
owner's request). Method: web search summaries and product listings, no
sign-ins. Listings and publisher pages are promotional; claims about what
learners _do_ come from reviews and forum posts and are anecdotal. The question,
set by night 1: **what gives a study session an end, and what brings a learner
back?**

## Revisited — extra run, 2026-11-23 afternoon

The owner asked for the primary pages behind this file's two load-bearing
claims. **Most could not be read:** the cloud's network allowlist refuses
`lichess.org` and `chessbook.com` (DNS fails, as `openingbook.xyz` did on night
1), so Lichess studies and practice, the HollowLeaf and CheckRaiseMate posts and
Chessbook's site were not opened, and nothing was tried hands-on. GitHub was
reachable. What follows is from eight more searches and one repository page —
better than night 2's pass, still mostly developer listings. The hands-on check
is now a `[local]` item, or a night once those hosts are allowed.

**Claim A — "no free site joins video → book → drill → own games for one
opening".** _Weakened; restate it._ Steps 2–4 (repertoire, drill, own games) are
free in at least two newer tools, which night 2 missed:

- **Repertoire Builder** (HollowLeaf, Chessboard Magic; Lichess blog posts):
  free tier of 5,000 moves, 10 repertoires and **100 imported games from Lichess
  or Chess.com**, with a practice mode against Stockfish, the Lichess database
  "or even your own games". No spaced repetition found.
- **ChessAtlas** (App Store, Product Hunt; free with in-app purchases): "Connect
  Lichess or Chess.com and ChessAtlas shows exactly where you left your opening
  prep, then drills it back with spaced repetition". Few ratings; the free
  tier's limits are not stated.
- **Chessbook**: the listing also claims a free web platform and a 400-move free
  cap; which of the game check is free is unconfirmed.
- Open source: **chessli** (Lichess games and mistakes into Anki) and
  **chessdriller** (spaced repetition on Lichess studies; archived 2026-10-03).

Steps 1 + 3 (video with a drill) are free in **Chessable's Short & Sweet**
courses (10–30 annotated lines, "sometimes with an hour or two of video",
MoveTrainer reviews) and Chess.com Practice. **Chessly** joins video and drill
but sells it ($64 a course; one free chapter).

So "own games against your prep" is **not** a paid-only moat (bullet 5 below was
wrong), and the four-step join is not ours alone to claim. What none of the
sources showed is the shape we already have: **no sign-up, every named position
(12,377), videos pooled from many creators per position, and line choice by how
often club players meet it**. Every tool above starts from a repertoire the
learner must build first; ours could start from the page a learner lands on.
That, not "the only free site", is the claim to carry to Gate A, and it still
needs a hands-on check of HollowLeaf and ChessAtlas.

**Claim B — "learners return only when something changes while they are away".**
_Holds as a pattern, unproven as a cause; add a third mechanism._ No retention
numbers were found for any product (Chess.com, Chessable or a spaced-repetition
app). The counter-example is Chess.com's **Daily Puzzle**: the same new puzzle
for "more than a million members" every day, kept alive by a streak (each puzzle
within 48 hours) and a calendar of flames. That is new content bringing people
back, but as a daily ritual with a streak, not as volume. Restated: three return
mechanisms — **reviews come due, new games to check, a daily ritual with a
streak**. Each needs per-learner state; the first two need it to change on its
own. A forum sceptic notes streaks bring people back for the puzzle and no
further, which is the risk for us too.

**What changes for Gate A.** The own-games idea is worth building only if it
starts from where learners already are (our page, no account) — a repertoire
tool that needs setting up first exists free elsewhere. A cheap daily ritual
("today's line" on an opening you visited) is a third candidate shape alongside
practice memory (#196) and the personal strip (#195).

Sources (this section): chessdriller
[GitHub](https://github.com/gtim/chessdriller); via search only —
[Repertoire Builder beta](https://lichess.org/@/HollowLeaf/blog/chess-repertoire-builder-beta-update/hfMtn2Rs),
[ChessAtlas, App Store](https://apps.apple.com/app/id6770867404),
[ChessAtlas, Product Hunt](https://www.producthunt.com/products/chessatlas),
[Chessbook, App Store](https://apps.apple.com/us/app/chessbook/id6466343415),
[chessli](https://github.com/pwenker/chessli2),
[Chessly Beginner course](https://chessly.com/courses/940dcdc1-b49a-403f-8375-919d186d5dd4),
[Chessable Short & Sweet guide](https://www.chess.com/blog/TheUnidentifiedWolf/comprehensive-guide-to-chessables-free-short-and-sweet-opening-courses),
[Chess.com Daily Puzzle](https://support.chess.com/en/articles/8708990-how-does-the-daily-puzzle-work),
[Chess.com Streaks](https://support.chess.com/en/articles/9714718-what-are-streaks).

## The products, in one line each

| Product                            | Unit of study                                                                        | What ends a session                                             | What brings you back                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Chessable** (MoveTrainer)        | A course chapter: text/video, then lines you must play on the board                  | The chapter's lines are learned, or today's reviews are cleared | Spaced repetition: lines come back "when due", missed ones sooner                                                          |
| **Chessbook**                      | Your own repertoire tree, built from several sources                                 | Review queue empty; coverage % per opening                      | Reviews due; it checks your recent Lichess/Chess.com games against your repertoire and quizzes you on where you went wrong |
| **Lichess studies**                | A chapter; "interactive lesson" mode gives instructions, hints, right/wrong feedback | The chapter's last move                                         | Nothing built in; listudy.org (third party) adds a move trainer on top                                                     |
| **Aimchess**                       | A report on your last ~40 games, then trainers                                       | The trainer set                                                 | Your new games: it finds your commonest opening mistakes and drills the right move with spaced repetition                  |
| **Everyman "Move by Move"** (book) | A chapter built round complete annotated games                                       | The chapter                                                     | — (a book); its form is Q&A that "replicates lessons between teacher and student", with exercises throughout               |

## What the sources agree on

1. **A session ends when a finite thing is done.** Every product above has one:
   a chapter, a review queue, a trainer set. Our opening page has none — it is
   12,377 positions of reference with no "you've done this one".
2. **Return visits are driven by something that changes while you're away.** Two
   mechanisms only: _reviews come due_ (Chessable, Chessbook) or _you played new
   games_ (Chessbook, Aimchess). Nobody brings learners back with new content
   alone.
3. **Playing the move beats reading it.** Chessable, Chessbook, Lichess
   interactive lessons and the Move by Move Q&A all make the learner produce the
   move before showing it. Our Practice mode does this for one line, then
   forgets.
4. **Memorising is not understanding.** The recurring critique of Chessable is
   that spaced repetition suits forced lines and that courses aim at titled-
   player lines most learners never meet. Aimchess users report the reverse
   problem: "knew my way out of the opening but lacked a plan after it". Books
   answer this with whole annotated games. Our `common_plans` are the raw
   material for "the plan after it", but unlinked to positions (night 1).
5. **Your own games are the strongest hook, and it is paid everywhere.** _(Wrong
   — see Revisited: free in Repertoire Builder and ChessAtlas.)_ Chessbook's
   game check and Aimchess's opening improver are behind Pro tiers ($7.99/month
   each in US listings). Lichess and Chess.com "insights" show stats but do not
   turn them into a lesson.
6. **Learners already use a four-step workflow across four sites.** Forum and
   blog advice converges on: _video for the overview → a Lichess study as the
   written repertoire → spaced-repetition drill → refine from your own games._
   One poster's failure mode is ours too: hopping video to video, opening to
   opening, and forgetting the first. Chess.com's Practice pairs a drill against
   the engine with a "Learn" tab lesson for the chosen opening — the only free,
   single-site version of steps 1 and 3 found tonight.

## What this means for us

- **No free site joins all four steps for one opening.** _(Weakened — see
  Revisited: steps 2–4 are free elsewhere; our edge is no account and every
  position.)_ We already hold three of the four ingredients per position: ranked
  videos (step 1), descriptions and `common_plans` (the written book, step 2),
  and a Practice mode that makes you play the moves (step 3, single line, no
  memory). Step 4 has a seam: `/analyse` links into pages with
  `ref=personal&username=…`, ignored today.
- **The cheapest "end" for a session** is a finite unit on one opening — a
  chapter with N lines to play through — and a visible "done". That is a lesson,
  not a reference page.
- **The cheapest "reason to return"** without accounts is local state that
  changes while you're away: lines due for review (#196 practice memory is the
  existing issue) or "your recent games left your lines here" (the deviation
  trainer, #195's personal strip). Both are paid features elsewhere.
- **Don't copy Chessable's depth.** The critiques are about overload and lines
  too deep for club players. Our popularity stats (all rated Lichess players)
  can choose lines by how often they are actually met at a learner's level —
  Chessbook's one differentiator, and it charges for it.
- **Plans need positions.** Every critique that "I know the moves but not the
  plan" points at `common_plans`; tying a plan to the board where it applies is
  what a book chapter does and a bullet list does not (night 4's question).

## Not checked tonight

- The YouTube creators the video index ranks highest: `video-index.json` is 31
  MB and its shape was not obvious from a quick read; left to night 3, which
  asks the YouTube question directly.
- Chessable's and Chess.com's actual retention or completion numbers: none
  published in what was found. No Starting Out series detail beyond Move by
  Move.
- Nothing was clicked through; all from search summaries.

## Sources

- Chessable MoveTrainer:
  [Andy Matuschak's notes](https://notes.andymatuschak.org/zDr94hP6bG3jJYrdYy8B5hx),
  [FIDE, "From flashcards to Chessable"](https://www.fide.com/from-flashcards-to-chessable/),
  [Zwischenzug on spaced repetition](https://zwischenzug.substack.com/p/spaced-repetition)
- Chessbook:
  [App Store listing](https://apps.apple.com/us/app/chessbook/id6466343415)
- Lichess:
  [Interactive lessons](https://lichess.org/blog/WtDErSQAADJfhJJs/interactive-lessons),
  [Chess insights](https://lichess.org/blog/VmZbaigAABACtXQC/chess-insights)
- Aimchess: [aimchess.com](https://aimchess.com),
  [review on Chess.com](https://www.chess.com/blog/SheldonOfOsaka/aimchess-a-review)
- Chess.com:
  [What is Practice](https://support.chess.com/en/articles/8724749-what-is-practice),
  [Opening Insights](https://www.chess.com/news/view/announcing-opening-insights)
- Move by Move:
  [English: Move by Move](https://www.simonandschuster.com/books/English-Move-by-Move/Steve-Giddins/9781857446999),
  [Sicilian Scheveningen preview](https://www.everand.com/book/951184708/The-Sicilian-Scheveningen-Move-by-Move)
- Workflow:
  [CheckRaiseMate, how to learn an opening](https://lichess.org/@/CheckRaiseMate/blog/how-to-learn-an-opening-in-2023/1Utogv4G),
  [Chess.com forum, preferred method](https://www.chess.com/forum/view/chess-openings/preferred-method-for-learning-openings),
  [MoveTrainer vs a video series](https://www.chess.com/forum/view/chess-openings/learning-with-movetrainer-vs-a-video-series)

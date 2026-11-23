# 02 — How others teach openings

Night 2, 2026-11-23 (run Monday ~13:20 UTC, before the weekly reset, at the
owner's request). Method: web search summaries and product listings, no
sign-ins. Listings and publisher pages are promotional; claims about what
learners _do_ come from reviews and forum posts and are anecdotal. The question,
set by night 1: **what gives a study session an end, and what brings a learner
back?**

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
5. **Your own games are the strongest hook, and it is paid everywhere.**
   Chessbook's game check and Aimchess's opening improver are behind Pro tiers
   ($7.99/month each in US listings). Lichess and Chess.com "insights" show
   stats but do not turn them into a lesson.
6. **Learners already use a four-step workflow across four sites.** Forum and
   blog advice converges on: _video for the overview → a Lichess study as the
   written repertoire → spaced-repetition drill → refine from your own games._
   One poster's failure mode is ours too: hopping video to video, opening to
   opening, and forgetting the first. Chess.com's Practice pairs a drill against
   the engine with a "Learn" tab lesson for the chosen opening — the only free,
   single-site version of steps 1 and 3 found tonight.

## What this means for us

- **No free site joins all four steps for one opening.** We already hold three
  of the four ingredients per position: ranked videos (step 1), descriptions and
  `common_plans` (the written book, step 2), and a Practice mode that makes you
  play the moves (step 3, single line, no memory). Step 4 has a seam: `/analyse`
  links into pages with `ref=personal&username=…`, ignored today.
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

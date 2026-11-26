# Gate A — direction

## Night 9 addendum, 2026-11-26: Revision 1 spiked, and the alternative tested

Revision 1 is still the pick, and tonight is the first time it was clicked
through. **Screenshots:** `spikes/10-play-through/1-pause.png` … `6-memory-done.png`
(Center Attack, 390 px, throwaway HTML, real 1400-band numbers).

- **Two changes from clicking it.** Pause only where your _opponents_ split
  (3 pauses on this line; 1–3 on 88% of 706 long lines), not at every split (5
  of 10 steps). And end with "what next": 68% play 6.cxd4, 24% play 6.e5, which
  wins more. Then, with an engine, the mistake: after 6.e5, 29% of Black answer
  6...Ng4, which Stockfish rates more than a pawn worse; "Punish it →".
- **What it is not yet:** a session. Watch plus memory is 2–3 minutes for 10
  ply. Gate B has to string several cards (the family's lines, or the line and
  its end-pause branches).
- **The alternative, killed:** an engine-checked "mistakes at your level" trap
  set (`spikes/06`, `08`). The data-only version would have taught something
  false 2 times in 5; with Stockfish it holds, but it lives almost only in
  1.e4 e5, half of it is famous traps or engine trivia, and **openingpuzzles.com
  already does it** ("Fried Liver … 5...Nxd5: 49% of players rated 1200–1400
  fall for it"). It survives only as the optional "punish it" step above.
- **New question (5 in `questions.md`):** may engine evaluations be used on the
  site at all? Default: no; the end pause then shows the moves and results only.

## Revision 1 — night 7, 2026-11-25: your questions answered

You said "possibly", and asked four things: where would the videos come from,
the idea only pays on medium-to-long lines, 11 minutes is too much for the
Giuoco Piano, and it leans on every video being good. You also suggested
animating the line on the board behind a play button. The numbers agree with
you, so the recommendation changes. **The board carries the unit, and video
becomes optional.**

**Where the videos would come from: for long lines, nowhere.** These numbers
come from `video-index.json`, `popularity_stats.json` and the ECO files, for
positions with 5,000+ Lichess games. A "line video" here is one of 15 minutes or
less whose title names the line.

| Line length | Positions | Has a line video | Lead video is a 20+ min lecture |
| ----------- | --------- | ---------------- | ------------------------------- |
| ≤4 ply      | 748       | 74 (10%)         | 457 (61%)                       |
| 5–8 ply     | 2,068     | 163 (8%)         | 1,505 (73%)                     |
| 9–12 ply    | 1,396     | 54 (4%)          | 1,195 (86%)                     |
| 13+ ply     | 489       | 16 (3%)          | 453 (93%)                       |

The title match is crude and undercounts a little: "Chess Openings: Giuoco
Piano" counts, but a video that covers 5.d4 without saying so does not. The
shape still holds. The longer the line, the more its shelf is family lectures
shared by hundreds of pages. Every video-first design fails on exactly the lines
where you said the unit is worth having. Making our own videos is out of reach.

**Revised recommendation: "Play through this line", board first.**

1. **A play button animates the line on the board**, one move at a time, at a
   readable pace. Pause and step back work at any point. It stops by itself at
   the two or three moves where players at your level split, with a one-line
   caption of real explorer data, such as "At 1400–1600, N% play 5.d4 here" (the prototype fills N from the proxy).
   No prose is written for it, so there is nothing to fabricate or review.
2. **Then your turn:** play the same line from memory in Practice, with a
   message on a wrong move ("the line plays 5.d4"). This builds on #241's
   arrow.
3. **A visible done.** If the shelf holds a short video that names this line
   (3–10% of pages, table above), it is offered under "Watch someone explain
   it". It is never required, and nothing depends on video quality.
4. **Only on lines worth it:** offered from about 8 ply. The 1.e4 e5 page does
   not get a play-through of two moves (your point).

This works on every one of the 1,885 lines of 9+ ply with 5,000+ games, not on
the 70 that happen to have a fitting video. It needs no new data, no LLM and no
pipeline. The band numbers come from the `position-stats` shards in the
`/page/:fen` response, which the page already loads, not from the
rate-limited `/api/explorer` proxy (corrected after the critic). It also stays inside your "videos, then play" way of
learning: the animation stands in for the part of a video that walks the moves,
and the video is still there when a good one exists.

**Default prototype line:** Italian, Classical Variation, Center Attack
(1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4, 10 ply, 252k games), where the
order of c3 and d4 is the point, rather than the 6-ply Giuoco Piano. Its shelf
holds no line video, so the prototype also shows what the unit looks like
without one. That is the common case.

**What this drops from the first draft:** the 11-minute video as the default,
"watch first" as step one, and the claim that the unit leans on the shelf. The
rest stands: no account, no repertoire, nothing loops, and no claim to bring
anyone back. The slice plan below still applies, with step 1's prototype
changed to the play-through. Slice 1 (wrong-move message, `?practice=`, no
band-blind extension) is unchanged.

**Questions, revised** (they replace 2 and 5 below; 3 and 4 stand):

- **A. Yes or no to the board-first direction?** _A gate: no design until you
  answer._
- **B. Is the Center Attack line right for the prototype**, or do you want a
  line you play yourself? _Default: Center Attack._
- **3 and 4 below** are still open. _Defaults as written: memory left out, slice
  1 waits for Gate B._

**The critic's case against Revision 1, answered.** A fresh subagent argued
against this revision. Its points were checked tonight.

1. **"The band data comes from the rate-limited proxy, so a cold 10-ply line
   would burn 10 of the 25 calls a minute."** _The source was wrong in my
   draft; the budget worry is not real._ Since #204 the bands come from the
   `position-stats` shards in `/page/:fen`, and the shards hold all 12,377
   positions (counted tonight, not the ~512 the critic guessed from six shards).
   The explorer proxy is not touched. Coverage, 1400 band, for the 1,885 lines
   of 9+ ply with 5,000+ games: 1,330 have every earlier position as a named
   position, and every one of those has 100+ band games at each of them. The
   other 555 pass through a position with no name, which gets no caption
   (string match on move order, so it undercounts).
2. **"A play button is nearly free: the page has step buttons and Practice's
   autoplay."** _Accepted._ The novelty is the pauses and their captions, plus
   handing over to Practice. The play button itself is cheap.
3. **"It is watch-then-play with a weaker watch."** _Partly accepted._ It is
   meant to be the same shape as the owner's way of learning. Whether an
   animation is enough to then play the line is what Gate B tests on a phone.
   The `practice_abandon` read (step 0) is still `[local]`, and still comes
   first.
4. **"The table shows video-first fails, not that board-first works."**
   _Accepted._ Nothing shows learners want an animation. That is a hypothesis
   for Gate B, and the owner suggested it.
5. **"Which moves count as a split is unspecified."** _Accepted; a rule
   now._ A split is a position where the band's top move is under 60% and the
   second is over 20%. By that rule, 1,799 of the 1,885 lines have two or more,
   so the prototype shows at most three, the ones with the most band games.
   Nothing is written by hand.
6. **"Caption numbers can differ between viewers; the bands are coarse."** The
   shards are rebuilt by the popularity pipeline, not live, so the numbers do
   not drift between viewers. The bands are the site's existing four (under
   1400, 1400, 1800, 2200). The caption names the band rather than "your level"
   until the learner picks one.

---

_The first draft follows, unchanged except where Revision 1 overrides it._

Night 6, 2026-11-24. Written from `research/01`–`05`, the open issues and PRs
(read tonight), and `baseline.md`. The charter says nothing is designed before
this gate passes; this file asks for that yes.

## The recommendation, in one paragraph

**A study unit for one line of one opening family: watch, then play.** A learner
who has decided to study the Giuoco Piano opens one page. It puts a short video
that covers that line beside the board. Then it asks them to play the line they
just watched from memory, in Practice, with a word when a move is wrong. Then it
shows "what players at your level answer here" at two or three key positions,
and it ends with a visible done. If they come back on the same device, the site
says which move they missed last time. That helps once they are back, but it is
not a reason to come back (critic 1). There is no account and no repertoire to
build first.

It is **not** a drilling trainer. PR #241 records your decision of 2026-11-10:
no Chessable-style courses or looping drill, because you learn from videos and
then play. The unit follows that shape. One video, one play-through as a test of
what was watched, and one reminder later. Nothing loops, there are no due dates
and there are no streaks (#196's own "done when").

## Who it is for, and who it is not for

For the learner who already **chose** to study, the kind of person who presses
Practice or opens a gallery (13 and 20 people in 30 days, counts that may be
inflated by the unexplained spike). For the three weeks of the experiment, the
honest audience is **you and any testers**. The unit sits on an unlinked route,
so no real visitor reaches it before Gate C. It is **not** for the median
visitor from Google, who lands on an obscure line and leaves in 0 seconds
(`baseline.md`). Nothing here claims to fix the 76% bounce rate. If Search
Console shows the landing queries are mostly "how to play X" rather than exact
line names, the audience is larger. That is still a `[local]` check.

## Why this, from the research

1. **A visit has no length because there is nothing to finish** (`research/01`).
   Every page describes a position, and none of them teaches one. The cheapest
   fix is a finite unit with a visible done (`research/02`).
2. **The gap is practising what you watched, not watching it** (`research/03`).
   Learners find videos on YouTube by creator, and every fix they describe sends
   them to a second tool to play the moves. We hold both halves on one page, but
   the two never meet. On a phone the video gallery is closed and sits two
   screens down. 7 of the 20 people who saw a gallery clicked a video.
3. **Practice is the leaky step, and the leaks are visible** (`research/04`,
   `gates/night4/`). A wrong move gets no message. The drill asks for moves the
   page never showed. Its popularity-picked extension drilled the Italian into
   3…Nf6 4.Nc3 Nxe4. It ends at "Complete!" with nothing next. Only 5 of the 13
   who started finished. #241 adds the arrow on the third wrong move; what is
   still missing is a word saying what the line plays.
4. **A reason to come back has to change while you are away** (`research/02`),
   and nothing here does. #196's "Last time you missed move 7" is only seen by
   someone who already came back. So this proposal gives a visit an end and does
   **not** claim to fix the ~4% return rate. A return mechanism needs due lines
   (the drill you dropped) or something external (e-mail, accounts). Both are
   out of scope unless you say otherwise.
5. **Our edge is the explorer data, not the prose** (`research/04`). "At your
   level, N% of Black players answer here with X" is real data, read live from
   the cached `/api/explorer` proxy and never stored. That is the question
   format of a good opening book, with something only we hold. The free written
   book already exists (Wikibooks) and we should not rewrite it.
6. **Own games are a later, optional layer** (`research/05`). Analyse has 15
   users a month, and opening pages have 117. Rev 5.1 also found that named
   lines produce false "leaks" (about half of the top ones). #195's
   `?practice=white|black` is the seam a unit and own games share, so it is
   built anyway.

## Alternatives turned down

| Alternative                                                           | Why not now                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deviation trainer first (your games in the book)                      | 15 users a month. Named lines headline false leaks (Rev 5.1 finding 2). Competitors already do it with a repertoire. It stays a later layer through `?practice=`.                  |
| A written chapter for all 31 families                                 | Needs LLM spend or weeks of content-routine review. Wikibooks already covers the top of the tree. Of the 205 pages reviewed so far, 33% needed a fix.                              |
| Practice fixes alone                                                  | Cheap and worth doing, but gives no reason to return. They become part of slice 1, not the feature.                                                                                |
| More plan text per page (#228–236)                                    | In flight as your own PRs. Plans stay a reference; the unit does not rest on unreviewed plan lists.                                                                                |
| A Chessable-style drill trainer                                       | Your decision of 2026-11-10 (#241). Better drilling is one click away elsewhere.                                                                                                   |
| Re-rank videos: short and line-named over long family lectures (#244) | Probably the cheapest win for videos (46% of shelves already hold one under 15 minutes). But it changes the scorer, which the video pipeline owns. Noted for #244, not built here. |

## What already exists, and how this builds on it

- **#241** (open, hint ladder): kept. The wrong-move message goes on top of it,
  so a new branch rebases on #241 if you merge it first.
- **#195** (personal strip + `?practice=`): only the `?practice=` part is in
  slice 1. The strip waits for the own-games layer.
- **#196** (practice memory): slice 2, built as the issue specifies.
- **#199** ("Start here"): the natural place to link units from once they exist.
  Not touched before Gate C.
- **#197, #207, #209**: not part of this. #207 (sparring) is a drill and falls
  under the 2026-11-10 decision unless you say otherwise.
- **#234–236**: content routines' and yours; not touched.

## Success measure

Traffic is 30–50 real people a week, too few to judge anything by analytics in
three weeks (`baseline.md`). So:

- **Gate B is a usability check, not evidence of return** (critic 3). With you
  as the only tester, it asks two things on a phone. Can you finish the unit in
  under ten minutes without help? Would you use it on an opening you actually
  play, the way you learn (video, then play)?
- **Evidence of return needs outside testers.** That means at least two people
  who come back unprompted two or more days later (questions.md 1). Without
  them, the retrospective records that return was never tested, rather than
  claiming it.
- **Sanity check after Gate C:** the share of Practice starts that reach the end
  (today 5 of 13), and whether any `practice_start` comes from a returning
  device. Neither is a target.

## Rough slice plan

The charter says nothing is built for production before Gate B, so the order is:

0. **Before designing, `[local]`, about 5 minutes:** read `practice_abandon`
   `{moves, of}` in PostHog to see where the 8 of 13 stopped. If they stopped at
   the first wrong move, the wrong-move message is the fix. If they stopped deep
   in the extension, it is the extension.
1. **Design, nights 7–9 → Gate B.** A clickable prototype of the unit for **one
   line** (default: Giuoco Piano, 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5, with 3…Nf6 marked
   "not covered here"), on an unlinked route on a `feat/exp-…` branch with a
   draft PR so Vercel builds a preview. The video has to cover that line and be
   short enough for a ten-minute unit. Default: thechesswebsite's "Chess
   Openings: Giuoco Piano" (11 min), already on the Giuoco Piano shelf, rather
   than the 22-minute family lecture that leads 258 of the 413 Italian pages.
   The cloud cannot watch YouTube, so you confirm what the video shows. The
   prototype uses real explorer numbers and hides any question whose band sample
   is small. Any notes on key positions are drafted and marked as drafts for you
   to review. Screenshots at 390 px go in `gates/`.
2. **Build slice 1:** `?practice=white|black` (#195's seam), the wrong-move
   message ("the line plays 4.d3"), the line shown once before it is drilled,
   and no extension into lines a learner's band does not meet. Test first.
3. **Build slice 2:** #196, practice memory and "Last time you missed move N".
4. **Build slice 3:** the unit page for the Gate B family, behind its unlinked
   route.
5. **Later, not in three weeks:** more families, `#199` linking, and own games
   through `?practice=`.

Each build slice is a draft PR for Gate C. You test the preview and you merge.

## The critic's case, answered

A fresh subagent argued against the first draft of this file. Its two
data-backed points were re-checked against `video-index.json` tonight and hold.

1. **The return hook cannot cause a return.** #196's note is only seen by
   someone who has already come back, and due dates are ruled out. _Accepted._
   The claim is withdrawn: the unit gives a visit an end, not a reason to return
   (Why #4, rewritten).
2. **It renames the drill you dropped.** Play from memory, then "Lines to
   review", then the line offered again is what `research/01` called "a drill
   that remembers". _Partly accepted._ It is one play-through that tests a
   video, in the order you learn (watch, then play), not a course of looping
   lines. But that line is yours to draw, so question 3 now has no default of
   yes. Your own Rev 5.1 order (games, then forks with your results, then what
   your level plays, then a video) is the own-games layer, and it stays later
   for the reasons in `research/05`.
3. **The success measure grades itself.** With the owner as the only tester, it
   cannot fail on return. _Accepted._ Gate B is now a usability check, and
   return needs at least two outside testers or is recorded as untested.
4. **The Italian video does not fit.** One 22-minute "Opening Basics and Common
   Variations" leads 258 of the 413 C50–C59 positions, and only 15 of the 60
   distinct videos are under 15 minutes. _Accepted._ The prototype uses the
   11-minute Giuoco Piano video already on that shelf, and you confirm it shows
   the line.
5. **One line cannot cover the family.** C55, the Two Knights (3…Nf6), is
   Black's choice on move 3. _Accepted._ The prototype covers one line and says
   what it leaves out. A family-wide unit would be a small course, and it is not
   proposed.
6. **The audience is about zero during the experiment.** _Accepted._ "Who it is
   for" now says the audience is you and the testers.
7. **A cheaper path was turned down.** Practice fixes plus moving the video
   higher on phones, after reading the abandon data. _Partly accepted._ The
   abandon read is now step 0, and question 4 asks to build slice 1 early. The
   fixes alone still give a session no end. Opening the gallery higher on phones
   is a layout change on every detail page, so it goes to slice 1's discussion
   and is not decided here.

Nits fixed: the move order (3…Nf6 4.Nc3 Nxe4). Explorer data per band exists
(`explorer.routes.js`, live and CDN-cached), but samples are thin past move 8,
so small-sample questions are hidden.

## What I need from you

1. **Yes or no to the direction.** _If I don't hear by tomorrow night, I'll
   wait: this is a gate, so the run exits rather than designing._
2. **Which family for the prototype?** _Default: the Italian Game._ London and
   Caro-Kann are the alternatives.
3. **Is a one-play-through test plus #196's "last time you missed move N" inside
   your 2026-11-10 "no trainer" decision, or is it the drill by another name?**
   I think it is inside, because nothing loops, but the critic argues otherwise
   and the decision is yours. _No default: if you have not answered by Gate B,
   the prototype leaves memory out._
4. **May slice 1 (the wrong-move message, `?practice=`, no band-blind extension)
   be built before Gate B?** It is bug-sized work on #195 and builds on #241,
   the prototype would use it, and it helps every Practice user whatever happens
   to the unit. _I recommend yes. Default if you are silent: no, because the
   charter's order holds._
5. **Which video and line for the prototype?** _Default: Giuoco Piano with
   thechesswebsite's 11-minute video._ You know whether it shows the line.

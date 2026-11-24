# Gate A — direction

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

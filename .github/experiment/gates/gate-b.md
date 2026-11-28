# Gate B — the play-through prototype

## Revision 1 — night 11 (2026-11-28), after your phone test

You said the memory step is good but should repeat the parts you get wrong, then
go once through. You said the puzzles are interesting but not connected to the
opening, unless there is "a clever way". Both are now on the same preview (PR
#252, updated tonight). On the `vercel.app` address, Play through opens on any
opening page without `?lab=`.

Try these three (Black, Black, White) at the Intermediate level:

- French Exchange: `/opening/rnbqkbnr%2Fppp2ppp%2F8%2F3p4%2F3P4%2F5N2%2FPPP2PPP%2FRNBQKB1R%20b%20KQkq%20-%201%204`
- Two Knights, Polerio: `/opening/r1bqkb1r%2Fppp2ppp%2F5n2%2Fn2Pp1N1%2F2B5%2F8%2FPPPP1PPP%2FRNBQK2R%20w%20KQkq%20-%201%206`
- Italian, Center Attack (to see the parts drill on 5 moves):
  `/opening/r1bqk2r%2Fpppp1ppp%2F2n2n2%2F2b5%2F2BpP3%2F2P2N2%2FPP3PPP%2FRNBQK2R%20w%20KQkq%20-%200%206`

**1. Memory in parts** (`spikes/14`). Your moves come in parts of two. A part
with a miss repeats from its start until it is clean, then you play the whole
line once through. A clean first pass ends at once. Part markers show where you
are. A miss that many players make now says so: "d3 is played in 21% of games
here at your level, but it is another line."

**2. The clever way: "they leave the line"** (`spikes/16`). The Test step
replays your line, but where your opponents often play something else, they do,
and you find the reply. French Exchange: "White leaves the line: 3.e5 instead of
3.exd5. It is played in 42% of games here at your level. What do you play?" The
answer is 3...c5, the Advance French's key idea. Answers are the most played
reply at 1400 that Stockfish rates sound. A move within 15 cp of the engine's
best also counts. Easy ones are dropped: recaptures, castling, a move already in
your line, a single possible answer. **279 lines** have one.

**3. Puzzles that still look like the opening** (`spikes/15`). Night 10's
puzzles kept a median 69% of the line's board and started 5 moves later. That
is what you saw. Now a puzzle must keep the pieces your line moved and be
reachable from the line's end (pawns, developed pieces, castling rights). It
starts a median 2 moves after the line. **364 lines** have at least one.

Together, 553 of 1,592 popular lines have a Test step, up from 524 with loose
puzzles. The others end after memory.

**An independent critic** (Opus) checked all this before you. It found four
real problems, and all are fixed:

- the shares were true only at 1400 (the step now shows only at 1400);
- half the questions were trivial;
- Stockfish's own first choice was refused;
- the Fried Liver page had three copies of a sibling-line puzzle.

**Still weak:** the Center Attack and the Najdorf have no "off the line" question
(no clear reply at any split), and the step needs a file per level before it can
show above or below 1400.

**Questions** (answer in #249):

- **8.** Does "they leave the line" feel like the connected test you meant? If
  yes, it goes into the Gate C plan, built per level. If not, the Test step is
  near puzzles only.
- **9.** Should a miss in the final once-through send you back to that part
  again (stricter), or end with "1 move to look at again" (now)?

---

Night 10 (2026-11-27). You said yes to board-first at Gate A. This is the
clickable prototype. It is built in the real app on draft PR #252, so the Vercel
preview runs it on your phone. **Please don't merge it**: Gate C will come back
as separate, smaller PRs.

## Try it (about 10 minutes)

Open the preview on your phone:
https://openingbook-git-feat-exp-play-through-fred-wildis-projects.vercel.app
(Vercel's login). Add any of these paths, or put `?lab=playthrough` after any
opening page you play yourself:

- Italian Center Attack (White):
  `/opening/r1bqk2r%2Fpppp1ppp%2F2n2n2%2F2b5%2F2BpP3%2F2P2N2%2FPP3PPP%2FRNBQK2R%20w%20KQkq%20-%200%206?lab=playthrough`
- Caro-Kann Advance (Black):
  `/opening/rnbqkbnr%2Fpp2pppp%2F2p5%2F3pP3%2F3P4%2F8%2FPPP2PPP%2FRNBQKBNR%20b%20KQkq%20-%200%203?lab=playthrough`
- Najdorf (Black):
  `/opening/rnbqkb1r%2F1p2pppp%2Fp2p1n2%2F8%2F3NP3%2F2N5%2FPPP2PPP%2FR1BQKB1R%20w%20KQkq%20-%200%206?lab=playthrough`
- King's Indian Orthodox (Black, no puzzles):
  `/opening/rnbq1rk1%2Fppp2pbp%2F3p1np1%2F4p3%2F2PPP3%2F2N2N2%2FPP2BPPP%2FR1BQK2R%20w%20KQ%20-%200%207?lab=playthrough`

The level you saved on the site sets the band. Without one, it uses Intermediate
(1400–1800).

## The learner and the session

The learner is someone who has landed on a line they want to play, has five
minutes and a phone, and so far could only read a move list. The session has
three steps (screenshots in `spikes/13-prototype/`):

1. **Watch.** The line plays itself. It stops only where **your opponents** at
   your level split. Each stop shows the top moves (share of all games, and how
   often that side wins) and always the line's own move. The last stop is the
   strongest: "what happens next". For example, in the King's Indian Orthodox at
   1400, 47% of White players push 7.d5 and win 42%, while 21% castle and win
   53%.
2. **Your turn.** You play your side from memory, and the opponent answers by
   the line. One miss gets "a3 is not this line"; a second names the move.
3. **Puzzles.** You get three Lichess puzzles (public domain), rated ≤1600, that
   you solve as your side. They come from real games in the same variation with
   the same pawn structure and developed pieces. 516 lines have them, and the
   rest end at step 2. Lichess is credited and linked.

## What was tried and dropped tonight

- **A generic pawn filter for puzzles.** It let sibling lines in. On the Center
  Attack, 2 of the top 3 were slow c3/d3 games. A stricter rule (every pawn the
  line moved is still there or further up its file) keeps the right 28 of 1,420.
- **Puzzles on long tactical lines.** All 155 Frankenstein–Dracula puzzles
  happen _inside_ the 20-ply line, so they would quiz moves you just watched.
  Those lines get none.
- **The King's Indian gets thin puzzles.** Lichess has only 83 and 72 puzzles at
  ≤1600 for the Orthodox and Fianchetto, mostly middlegame. A d4 learner often
  ends at step 2.
- **An independent critic** (Opus) found five problems in the first build, all
  fixed before this document:
  - shares were of the top six moves, not of all games (34% shown, 32% true);
  - in 47% of puzzles you would solve for the _other_ side;
  - the line's own move could be missing from a pause (113 of 839);
  - "wins" didn't say whose wins;
  - on sub-variation pages, 7 of 18 puzzles came from a sibling line (for
    example, Neo-Arkhangelsk puzzles where Black never played ...Nf6).

  After the fixes, a second agent (Sonnet) checked 36 puzzles on 12 random
  sub-variation pages under a stricter test: can the page's position legally
  reach the puzzle in the moves available? **14 fit the exact sub-line, 19 are
  from a sibling line of the same variation, and 3 are unrelated.** Some
  "sibling" calls are arguable. It marks the Center Attack's 15cq6 sibling
  because the f6 knight is gone, but 6.e5 Ng4 takes it to e5. Even so, the
  honest claim is "**a game in the same variation**", which holds for 33 of 36,
  not "a game like this one". The puzzle screen says the former. The button
  before it still says "3 puzzles from games like this", which overstates; I'll
  fix it with the next push rather than trigger a third preview build tonight.
  Reliable fit to the exact line would need each puzzle's game moves, which
  lichess.org refuses to the cloud. One `[local]` route: fetch the 1914 games
  once from your machine.

## What I'm still unsure of

- **Why come back tomorrow?** That's the critic's first objection, and I agree
  with it. The session is a good first visit, but nothing changes while you're
  away. There are three answers, from cheapest to most effective:
  - **(a) Next line.** After the end pause, offer the line that follows. 776 of
    1,592 popular long lines end where a top-three move leads to another line of
    the same grade.
  - **(b) Fresh puzzles.** Serve different puzzles on each visit: the pool runs
    up to 181 for the Two Knights.
  - **(c) Come back to re-test.** In a few days the site asks you to play the
    line from memory again. It's stored in your browser, with no account.

  (c) is the only real reason to return, and it is the closest thing to a
  trainer. #241's "no trainer" decision (2026-11-10) may rule it out.

- **Short lines make short sessions.** The Caro-Kann Advance is three moves of
  memory.
- **Wins, not score.** "White wins 53%" leaves out draws. It is honest for
  comparing moves at one stop, but it is not a verdict.

## Questions

1. **Does it feel like a study session on your phone?** Try two lines, one of
   them a line you play. Yes means I plan Gate C as small PRs (the API route,
   then the component behind its flag, then the puzzle file). No means: what was
   missing? _Meanwhile: nights 11+ test (a) and (b) as spikes and take nothing
   to production._
2. **Is (c), a re-test in a few days with no account, inside the "no trainer"
   decision?** _Default: no (c). Nights test (a) and (b), and I bring (c) back
   only if you say it's allowed._

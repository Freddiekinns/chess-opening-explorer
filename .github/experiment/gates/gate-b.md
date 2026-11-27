# Gate B — the play-through prototype

Night 10 (2026-11-27). You said yes to board-first at Gate A. This is the
clickable prototype. It is built in the real app on draft PR #252, so the
Vercel preview runs it on your phone. **Please don't merge it**: Gate C will
come back as separate, smaller PRs.

## Try it (about 10 minutes)

Open the preview from #252 on your phone. Add any of these paths, or put
`?lab=playthrough` after any opening page you play yourself:

- Italian Center Attack (White): `/opening/r1bqk2r%2Fpppp1ppp%2F2n2n2%2F2b5%2F2BpP3%2F2P2N2%2FPP3PPP%2FRNBQK2R%20w%20KQkq%20-%200%206?lab=playthrough`
- Caro-Kann Advance (Black): `/opening/rnbqkbnr%2Fpp2pppp%2F2p5%2F3pP3%2F3P4%2F8%2FPPP2PPP%2FRNBQKBNR%20b%20KQkq%20-%200%203?lab=playthrough`
- Najdorf (Black): `/opening/rnbqkb1r%2F1p2pppp%2Fp2p1n2%2F8%2F3NP3%2F2N5%2FPPP2PPP%2FR1BQKB1R%20w%20KQkq%20-%200%206?lab=playthrough`
- King's Indian Orthodox (Black, no puzzles): `/opening/rnbq1rk1%2Fppp2pbp%2F3p1np1%2F4p3%2F2PPP3%2F2N2N2%2FPP2BPPP%2FR1BQK2R%20w%20KQ%20-%200%207?lab=playthrough`

The level you saved on the site sets the band. Without one, it uses
Intermediate (1400–1800).

## The learner and the session

The learner is someone who has landed on a line they want to play, has five
minutes and a phone, and so far could only read a move list. The session has
three steps (screenshots in `spikes/13-prototype/`):

1. **Watch.** The line plays itself. It stops only where **your opponents** at
   your level split. Each stop shows the top moves (share of all games, and how
   often that side wins) and always the line's own move. The last stop is the
   strongest: "what happens next". For example, in the King's Indian Orthodox
   at 1400, 47% of White players push 7.d5 and win 42%, while 21% castle and
   win 53%.
2. **Your turn.** You play your side from memory, and the opponent answers by
   the line. One miss gets "a3 is not this line"; a second names the move.
3. **Puzzles.** You get three Lichess puzzles (public domain), rated ≤1600,
   that you solve as your side. They come from real games in the same variation
   with the same pawn structure and developed pieces. 516 lines have them, and
   the rest end at step 2. Lichess is credited and linked.

## What was tried and dropped tonight

- **A generic pawn filter for puzzles.** It let sibling lines in. On the Center
  Attack, 2 of the top 3 were slow c3/d3 games. A stricter rule (every pawn the
  line moved is still there or further up its file) keeps the right 28 of 1,420.
- **Puzzles on long tactical lines.** All 155 Frankenstein–Dracula puzzles
  happen *inside* the 20-ply line, so they would quiz moves you just watched.
  Those lines get none.
- **The King's Indian gets thin puzzles.** Lichess has only 83 and 72 puzzles at
  ≤1600 for the Orthodox and Fianchetto, mostly middlegame. A d4 learner often
  ends at step 2.
- **An independent critic** (Opus) found five problems in the first build, all
  fixed before this document:
  - shares were of the top six moves, not of all games (34% shown, 32% true);
  - in 47% of puzzles you would solve for the *other* side;
  - the line's own move could be missing from a pause (113 of 839);
  - "wins" didn't say whose wins;
  - on sub-variation pages, 7 of 18 puzzles came from a sibling line (for
    example, Neo-Arkhangelsk puzzles where Black never played ...Nf6).

  After the fixes, a fresh sample on sub-variation pages scored
  **FIT_RESULT**.

## What I'm still unsure of

- **Why come back tomorrow?** That's the critic's first objection, and I agree
  with it. The session is a good first visit, but nothing changes while you're
  away. There are three answers, from cheapest to most effective:
  - **(a) Next line.** After the end pause, offer the line that follows. 776 of
    1,592 popular long lines end where a top-three move leads to another line
    of the same grade.
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
   then the component behind its flag, then the puzzle file). No means: what
   was missing? _Meanwhile: nights 11+ test (a) and (b) as spikes and take
   nothing to production._
2. **Is (c), a re-test in a few days with no account, inside the "no trainer"
   decision?** _Default: no (c). Nights test (a) and (b), and I bring (c) back
   only if you say it's allowed._

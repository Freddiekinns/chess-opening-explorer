# Spike 14 — memory in parts (night 11)

The owner's Gate B reply (#249, 2026-11-27): "the memorisation is good. And it
could be better if … having you repeat different parts of the opening if you get
errors until you get each sequence right. Then once through."

## Two readings, and the one built

- **(a) Part method:** always learn the line in parts, then the whole.
- **(b) Error-driven:** play through; a part with a miss repeats until clean;
  then the whole line once through.

The data decides between them (`chunks.js`, 1,592 popular named lines of 6+ ply
at 1400): the learner has **3 own moves on 419 lines, 4 on 556, 5 on 407, 6+ on
210**. In parts of three, 975 of 1,592 lines (61%) are a single part, so (a)
changes nothing for most lines. In parts of two it splits every line of 4+, but
forcing a learner who already knows the line through parts is friction. So (b):

- The learner's moves are split into parts of two (a lone last move joins the
  part before): 3 moves → 1 part, 4 → 2, 5 → 2, 6 → 3, 8 → 4.
- A miss in a part (the first or second, as before: "d3 is not this line", then
  the move named) marks it. When the part ends, "Part 2 again, until it is
  clean." and after 1.2 s the board rewinds to just before the part (the
  opponent's move replays, for context).
- A clean first pass ends at once: "You played the line from memory, first
  time."
- If any part repeated: "Every part is clean. Now the whole line, once through."
  Misses in that run get the same hints but do not loop again; the end says how
  many moves to look at again, and "Again" restarts.

## Walked at 390 px (Italian Center Attack, White, real app)

`drill-walk.js`: part 1 clean, a miss in part 2 (4.d3), part 2 again from
before 2...Nc6, clean; the whole line once through; done. No page errors.
Screenshots 1–5 here. Code: `parts-drill.patch` (on top of
`feat/exp-play-through`), with two new component tests and the old memory test
updated; 12 of 12 pass.

## Where it is weak

- Part markers were added after the critic: "✓ Part 1 (from 1.) · ▸ Part 2
  (from 3.)". The moves themselves stay hidden.
- Misses in the once-through pass give hints but do not loop again (the critic:
  "until each sequence is right" stops there). Deliberate, so the drill ends;
  the owner may want otherwise.
- During the 1.2 s before a rewind the counter already reads the next move.
- On a 3-move line, "part" = the whole line: the drill is "again until clean".

# Spike 09 — "does this trick work at your level?" (night 9, idea 18)

Night 8 killed idea 16 (gambit honesty) because a gambit's score moves under 6
points across bands. Tonight adds the engine's axis: is it sound, and does it
score anyway? `gambits.js` evaluates the position after each gambit move at
depth 20 (Stockfish 16, mover's view) and reads its share and score per band
from the shards (`gambits.txt`).

| Gambit    | Stockfish | u1400 share, score | 1400    | 1800    | 2200    |
| --------- | --------- | ------------------ | ------- | ------- | ------- |
| Stafford  | −1.7      | 23%, 53            | 41%, 52 | 33%, 49 | 13%, 48 |
| Halloween | −1.4      | 2%, 53             | 3%, 55  | 4%, 56  | 3%, 51  |
| Traxler   | −1.5      | 11%, 47            | 11%, 48 | 11%, 50 | 8%, 50  |
| Rousseau  | −1.3      | 2%, 54             | 4%, 53  | 4%, 51  | 1%, 46  |
| Englund   | −1.2      | 9%, 49             | 7%, 50  | 4%, 48  | 1%, 46  |
| Danish    | −0.2      | 22%, 55            | 37%, 56 | 44%, 55 | 32%, 51 |
| Evans     | 0.0       | 3%, 56             | 6%, 55  | 10%, 54 | 11%, 49 |

Twenty in the file. What it shows:

- **Unsound gambits score about 50% at every band, 2200 included.** The
  Stafford is −1.7 by Stockfish and still scores 48% at 2200. Night 8 was
  right that the score barely moves with rating; the engine column is what is
  new, and the gap between the two is the honest answer to "is the Stafford
  any good?": objectively lost, practically fine, at every level we have.
- **"Where it stops working" cannot be shown** from the sweep: of 15%+ share
  moves that are engine-bad (150+ cp) yet score at least as well as the
  alternatives at 1400, there are only 10 (`popular-unsound-1400.txt`), and
  2200 players do not play any of them.

Verdict: a one-line verdict on ~20 gambit pages ("Stockfish: −1.7. At your
level it scores 52%.") is true, short and on popular pages. It is a small
add-on, not a direction, and it needs engine numbers in production (the same
owner decision as idea 17).

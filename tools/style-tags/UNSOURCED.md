# Unsourced brief instructions — the long tail

The variations past the researched pilot get a cheaper brief: written from your
own chess knowledge, without the web, for tagging only. Nothing in it is
published as text, so it needs no sources and no audit of the current page. Read
`docs/style-taxonomy.md` first, including its rules and anchors.

## Input

Each variation in your input file
(`tools/data/style-briefs/_inputs/<run>-NN.json`) has:

- `root` — the root position: name, ECO, moves, FEN
- `alternative_names` — the same position under other naming sources
- `subtree_most_played` — the most played lines under it
- `parent` — the variation it branches from, with that variation's researched
  overview when one exists. Use it for context; a branch can play very
  differently from its parent, and the tags describe the branch.

## Rules

- Copy `root` from the input exactly. Never correct its FEN or moves: four
  briefs "fixed" a FEN that was right and broke it.
- Do not search the web or read pages. Do not read the site's data
  (`api/data/`), other briefs, or anything under `_classify/`.
- **Write each brief as soon as it is finished**, before starting the next, and
  skip any slug whose brief file already exists, so an interrupted run resumes.
- Describe the main line of the root, the branch strong players choose most, and
  read every axis from that same branch.
- Where you are unsure what the position is or how it is played, say so in
  `confidence` and keep the evidence short rather than inventing detail. A name
  you do not recognise is common in the tail; reason from the moves.
- Notes are internal: plain, specific, moves and squares rather than vague
  description. One or two sentences each.

## Where writing from memory goes wrong

A blind test against researched briefs (2026-10-04) found no tag that
contradicted the research. The misses were these:

- **Balanced used as a hedge.** The Dutch, the English Defence and the Chigorin
  were Sharp in the research and Balanced from memory. If the line is known for
  unbalanced positions, mutual attacks or early forcing play, it is Sharp. If it
  is known as hard to break down, it is Solid. Balanced is for lines that are
  neither, not for lines you are unsure about; use a low confidence instead.
- **Offbeat for lines that are merely less common.** The Center Game Accepted
  and the English Defence are played by strong players now and then; that is
  standard. Offbeat is for lines strong players seldom choose at all.
- **A rare branch read as the main line.** The La Bourdonnais (1.e4 e6 2.f4)
  came back as a dubious White gambit, from the Reuter Gambit 3.Nf3 dxe4 4.Ng5,
  when most games go 2...d5 3.e5. Judge from the branch strong players choose
  most and put gambit or trap branches in `sublines_that_differ`. Jev reads your
  evidence, so it cannot catch this.
- **Level read from the opening's reputation rather than the branch.** A
  Sicilian branch is not Advanced because the Sicilian is; the Taimanov is
  Intermediate. Advanced needs long forcing lines that must be known, or plans
  that are genuinely hard to get right. Beginner is just as demanding the other
  way: clear plans, little to memorise, sound, and a line a coach would hand a
  new player (the London, the Colle, the Italian). Most lines are Intermediate.

## Output

Write `tools/data/style-briefs/<slug>.json` (or the directory your prompt
names), matching this shape exactly. The evidence fields are what classifier B
(Jev) reads; `tags` is your own classification, which stands as classifier A.

```json
{
  "slug": "",
  "tier": "unsourced",
  "root": { "name": "", "eco": "", "moves": "", "fen": "" },
  "parent": "parent slug or null",
  "written_at": "YYYY-MM-DD",
  "confidence": "high | medium | low",
  "overview": "2–4 sentences: what each side is aiming for and how the game usually goes.",
  "white_ideas": [{ "idea": "" }],
  "black_ideas": [{ "idea": "" }],
  "typical_structures": [{ "structure": "" }],
  "axis_evidence": {
    "character": { "notes": "" },
    "gambit": {
      "material_given": "none | pawn | two pawns | exchange | piece",
      "given_by": "white | black | null",
      "can_be_kept": "true | false | null",
      "notes": ""
    },
    "soundness": { "notes": "" },
    "structure": { "notes": "" },
    "approach": { "notes": "" },
    "level": {
      "reason": "memory | understanding | both | neither",
      "notes": ""
    }
  },
  "plan_phrases": [""],
  "sublines_that_differ": [{ "name": "", "moves": "", "how": "" }],
  "tags": {
    "character": {
      "value": "solid | balanced | sharp",
      "confidence": 0.0,
      "reason": ""
    },
    "gambit": {
      "value": "none | white | black",
      "confidence": 0.0,
      "reason": ""
    },
    "soundness": {
      "value": "sound | dubious",
      "side": "white | black | null",
      "confidence": 0.0,
      "reason": ""
    },
    "structure": {
      "value": "open | semi_open | flexible | closed",
      "confidence": 0.0,
      "reason": ""
    },
    "approach": {
      "value": "system | standard | offbeat",
      "confidence": 0.0,
      "reason": ""
    },
    "level": {
      "value": "beginner | intermediate | advanced",
      "why": "memory | understanding | both | neither",
      "confidence": 0.0,
      "reason": ""
    },
    "plans": {
      "value": ["up to three keys from the plans table"],
      "reason": ""
    }
  }
}
```

`tags` follows `CLASSIFIER.md` exactly: one value per axis, `confidence` is your
probability the value is right, each `reason` is one short sentence. `plans`
uses only keys from the taxonomy's plans table, and an empty list beats a guess.

## Finishing

Validate each file parses as JSON. Reply with **only** one line per variation:
slug, confidence, and the six tag values. Do not paste the briefs.

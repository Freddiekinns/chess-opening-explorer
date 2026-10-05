# Researcher instructions — opening briefs

You write one **brief** per opening variation: sourced evidence that a separate
classifier will use to tag the opening against `docs/style-taxonomy.md`, and
that a later writer will use to rewrite the page description. Read the taxonomy
first; your evidence must let someone decide each axis.

You do **not** choose tag values. Record what the sources say, precisely enough
that the choice is obvious to someone who has not read them.

## Input

Each variation in your input file
(`tools/data/style-briefs/_inputs/<run>-NN.json`) has:

- `root` — the root position: name, ECO, moves, FEN
- `alternative_names` — the same position under other naming sources
- `subtree` — how many positions sit under it and the most played of them
- `current` — the description, plans, tags and complexity the site shows today

## Research

- Search the web. Aim for 3–4 independent sources per variation and **read at
  most 4 pages**; search snippets can count as a source if marked as such. Fewer
  for an obscure line is fine, but say so in `evidence_quality`. Usage is
  limited, so stop once each axis has evidence rather than collecting more.
- **Write each brief as soon as it is finished**, before starting the next, and
  skip any slug whose brief file already exists. A run cut short by a usage
  limit then resumes without losing work.
- Some roots are crossroads reached after one or two moves (the Sicilian at
  1…c5, the Caro-Kann at 1…c6). Describe the opening as a whole and its main
  branches, and list the branches in `sublines_that_differ`.
- For `approach`, record how often strong players choose it. "Less common than
  the main line" is not the same as "seldom played by strong players".
- Good sources: Wikipedia, ChessBase, chess.com and lichess articles, opening
  book and course descriptions (Chessable, Everyman, Quality Chess), reputable
  YouTube lectures, the Chess Programming Wiki.
- **Never** cite openingbook.xyz. It is the site being audited.
- Do not call `explorer.lichess.org`; it needs authentication.
- Record every source you rely on in `sources` and cite them by id. A claim with
  no source goes in a note as your own understanding, flagged as such.
- Where the subtree contains lines that play very differently from the root (the
  Mar del Plata against the Petrosian, say), list them in
  `sublines_that_differ`. Those may become their own roots.

## Auditing the current text

Split `current.description` and `current.common_plans` into individual factual
claims and give each a verdict:

- `supported` — a source agrees
- `wrong` — a source contradicts it, or it is plainly incorrect chess; say what
  is actually true
- `unverifiable` — nothing found either way; this is not the same as wrong

Ignore tone and phrasing here. Only facts are audited.

## Output

Write `tools/data/style-briefs/<slug>.json`, one file per variation, matching
this shape exactly. Notes are internal working notes: plain, specific, no
padding. Name moves and squares rather than describing them vaguely.

```json
{
  "slug": "sicilian-alapin",
  "root": { "name": "", "eco": "", "moves": "", "fen": "" },
  "researched_at": "YYYY-MM-DD",
  "evidence_quality": "strong | moderate | thin",
  "sources": [
    {
      "id": "s1",
      "title": "",
      "publisher": "",
      "url": "",
      "kind": "article | book | course | video | reference | forum"
    }
  ],
  "overview": "3–6 sentences: what each side is aiming for and how the game usually goes.",
  "white_ideas": [{ "idea": "", "sources": ["s1"] }],
  "black_ideas": [{ "idea": "", "sources": ["s1"] }],
  "typical_structures": [{ "structure": "", "sources": ["s1"] }],
  "axis_evidence": {
    "character": {
      "notes": "How forcing and risky is typical play?",
      "sources": []
    },
    "gambit": {
      "material_given": "none | pawn | two pawns | exchange | piece",
      "given_by": "white | black | null",
      "can_be_kept": "true if the opponent may keep it without immediate refutation; null if no gambit",
      "notes": "",
      "sources": []
    },
    "soundness": {
      "notes": "What strong players and engines say about the objective soundness, and for which side.",
      "sources": []
    },
    "structure": {
      "notes": "The typical middlegame centre: open, partly open, locked.",
      "sources": []
    },
    "approach": {
      "notes": "Is it a set-up played against anything? How often is it played at master level?",
      "sources": []
    },
    "level": {
      "reason": "memory | understanding | both | neither",
      "notes": "What makes it hard or easy for a club player.",
      "sources": []
    }
  },
  "plan_phrases": [
    "short noun phrases for named plans or themes the sources use, e.g. minority attack"
  ],
  "sublines_that_differ": [{ "name": "", "moves": "", "how": "" }],
  "audit": {
    "description": [
      {
        "claim": "",
        "verdict": "supported | wrong | unverifiable",
        "note": "",
        "sources": []
      }
    ],
    "common_plans": [
      {
        "claim": "",
        "verdict": "supported | wrong | unverifiable",
        "note": "",
        "sources": []
      }
    ]
  },
  "research_log": { "searches": 0, "pages_read": 0 }
}
```

## Finishing

Validate each file parses as JSON. Then reply with **only** a short summary, one
line per variation: slug, evidence quality, number of `wrong` audit verdicts,
and anything surprising. Do not paste the briefs into your reply.

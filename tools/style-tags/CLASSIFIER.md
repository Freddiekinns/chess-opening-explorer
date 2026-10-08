# Classifier instructions — style tags from briefs

You tag opening variations against `docs/style-taxonomy.md`, using only the
compact brief evidence in `tools/data/style-briefs/_classify/states.json`
(written by `node tools/style-tags/jev-classify.js --states`). Read the taxonomy
first, including its rules and anchors.

- Judge from that evidence. Do not search the web, and do not open the full
  briefs: the compact file is what the other classifier reads too.
- Do not read the site's current tags (`_inputs/`, `api/data/eco/`) or any other
  classifier's output under `_classify/`. Your answer must be independent of all
  of them.
- One value per axis. When the evidence is thin or points both ways, choose the
  most likely value and give it a low confidence rather than hedging in the
  reason.
- Describe the typical middlegame the line leads to, not its name.

## Output

Write `tools/data/style-briefs/_classify/claude.json`, merging into the file if
it exists, keyed by slug:

```json
{
  "<slug>": {
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
      "value": [
        "up to three keys from the plans table, most characteristic first"
      ],
      "reason": ""
    }
  }
}
```

`side` on soundness is the side taking the risk when the value is dubious,
otherwise null. `confidence` is your probability that the value is right. Each
`reason` is one sentence citing the evidence.

`plans` uses only the keys in the taxonomy's plans table
(`isolated_queens_pawn`, `minority_attack`, …). Pick a plan only when the
evidence names it or plainly describes it, and fewer than three is fine: an
empty list is better than a guess.

Validate the file parses as JSON, then reply with only one line per slug listing
the six values and the plans.

# Style tags

Replaces the LLM style tags on every opening with a fixed taxonomy: one value
per axis, words a player would use, chosen from sourced research rather than
from the opening's name. The rubric is `docs/style-taxonomy.md`; the plan and
the pilot's results are in
`docs/proposals/2026-10-02-opening-style-classification.md`.

Nothing here reaches the site yet. The export into `api/data` is the next step.

## Pipeline

| Step                                                      | Command / instructions                                                    | Writes                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1. Group positions into variations, pick the next batch   | `node tools/style-tags/select-roots.js --top 100 --batch 10 --name <run>` | `_inputs/<run>-NN.json`, `_inputs/variation-map.json` |
| 2. Research a batch (Sonnet subagent, web)                | `RESEARCHER.md`, one agent per input file                                 | `tools/data/style-briefs/<slug>.json`                 |
| 3. Classifier B                                           | `node tools/style-tags/jev-classify.js [--only axis,…] [slug …]`          | `_classify/jev.json`                                  |
| 4. Classifier A (Sonnet subagent)                         | `node tools/style-tags/jev-classify.js --states`, then `CLASSIFIER.md`    | `_classify/claude.json`                               |
| 5. Judge (Opus subagent) the disputes `validate.js` lists | `JUDGE.md`                                                                | `_classify/judge.json`                                |
| 6. Check                                                  | `node tools/style-tags/validate.js [--verbose]`                           | —                                                     |
| 7. Review table                                           | `node tools/style-tags/report.js`                                         | `_classify/pilot-tags.md`                             |

`_inputs/variation-map.json` and `_classify/states.json` are generated and not
committed: `select-roots.js --top 0` rebuilds the map, `--states` the other.

## Things that are not obvious

- **Variations are grouped by board, not by name or move text.** Names in
  `api/data/eco` come from several sources, and each position stores one move
  order, so Semi-Slav positions filed under the QGD order never pass through the
  Semi-Slav's own move string. Only `eco_tsv` names define variations; 1,429 in
  all.
- **`hubs.json`** lists crossroads such as 1.e4 and 1.d4 Nf6 that get no tags.
  **`shared-briefs.json`** maps one variation onto another's brief when they are
  the same opening (the London by 2.Bf4 and by 2.Nf3).
- **`final.js` is the only place the final answer is decided.** Precedence:
  override, judge, agreement, then classifier A where either side chose the
  hidden middle value. **`overrides.json`** holds owner-reviewed corrections,
  each with a reason.
- **The taxonomy doc is parsed** (`taxonomy.js`) for the anchors and the plans
  list. Editing those tables changes what the scripts check and ask.
- **Usage.** On the owner's Pro plan a brief costs roughly 1.3–2% of a 5-hour
  window, so research runs in waves sized to it. Briefs are written one at a
  time and existing ones are skipped, so an interrupted wave resumes cleanly.
  Jev costs pence and runs over everything.

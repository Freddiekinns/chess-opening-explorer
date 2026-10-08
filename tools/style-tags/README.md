# Style tags

Replaces the LLM style tags on every opening with a fixed taxonomy: one value
per axis, words a player would use, chosen from sourced research rather than
from the opening's name. The rubric is `docs/style-taxonomy.md`; the plan and
the pilot's results are in
`docs/proposals/2026-10-02-opening-style-classification.md`.

The site reads the result from `api/data/style-tags.json`, written by step 8.
`packages/api/src/services/style-tags-service.js` serves it to the detail page,
the opening cards, Discover's level and style filters, and style search. The old
`analysis_json` tags are still in the data; nothing user-facing reads them.

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
| 8. Export for the site                                    | `node tools/style-tags/export.js`                                         | `api/data/style-tags.json`                            |

The long tail past the pilot uses the **unsourced tier** in place of steps 2 and
4: `select-roots.js --unsourced --name tail --batch 20` writes the inputs,
Sonnet subagents follow `UNSOURCED.md` (no web, own knowledge, tags included),
and `node tools/style-tags/collect-unsourced.js` copies those tags into
`_classify/claude.json` as classifier A. Jev, the judge and the checks run as
before.

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
  hidden middle value; for an unsourced brief that last step needs A's
  confidence of at least 0.65 on a shown word, or the middle value stands.
  **`overrides.json`** holds owner-reviewed corrections, each with a reason; an
  override can replace a variation's plans too, which the judge does not rule
  on.
- **The export leaves out what is not decided.** Hubs and variations not yet
  classified get no entry, so their pages show no tags rather than the old ones.
  An axis still unresolved exports as its hidden middle value. Labels and
  glossary lines come from the taxonomy doc, so a renamed value reaches the site
  through the export, not through code. Re-run it after every wave.
- **The taxonomy doc is parsed** (`taxonomy.js`) for the anchors and the plans
  list. Editing those tables changes what the scripts check and ask.
- **Unsourced briefs carry `"tier": "unsourced"`** and no audit, so they can tag
  a page but are not evidence for rewriting its description. A blind test on 32
  researched variations (proposal, "Unsourced tier") found no tag that
  contradicted the research; the misses drop a word, mostly Sharp or a Level.
- **Usage.** On the owner's Pro plan a brief costs roughly 1.3–2% of a 5-hour
  window, so research runs in waves sized to it. Briefs are written one at a
  time and existing ones are skipped, so an interrupted wave resumes cleanly. An
  unsourced brief costs about 0.4% of a window and 0.06% of the week. Jev costs
  pence and runs over everything.

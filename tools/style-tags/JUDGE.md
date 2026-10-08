# Judge instructions — disputed style tags

Two classifiers tagged each opening independently against
`docs/style-taxonomy.md`. You settle only the axes where they chose two
different shown words; a dispute involving the hidden middle value is settled by
rule (see the taxonomy's rules). Read the taxonomy first, including its rules,
anchors and the notes under each axis.

## Input

`node tools/style-tags/validate.js` lists the disputed `slug.axis` pairs under
"unresolved (for the judge)", and the gambit axis of each slug under "Unsourced
gambits the name does not mention". The second list is agreed but suspect: an
unsourced brief (`"tier": "unsourced"`, written from memory without sources) may
have judged a rare gambit branch as the main line, and Jev reads the same
evidence. For those, search the web for the main line and rule on gambit and on
any other axis that depended on the same mistake. A prompt may also name agreed
axes found inconsistent with related openings; rule on those the same way. For
each one, read:

- the full brief, `tools/data/style-briefs/<slug>.json`, sources included
- both answers: `_classify/claude.json` (value, confidence, reason) and
  `_classify/jev.json` (choice and probabilities)

You may search the web when the brief does not settle it. Do not read the site's
current tags (`_inputs/`, `api/data/eco/`).

## Deciding

- Apply the taxonomy's definition literally, and its anchors as precedent. If a
  disputed opening is close to an anchor, say which one and why it matches or
  differs.
- Pick one value. If the evidence genuinely cannot decide, pick the more
  conservative value (the hidden middle value where the axis has one) and say
  so; a missing word is better than a wrong one.
- If the dispute shows the taxonomy's wording is ambiguous, note it in
  `taxonomy_note`. Do not edit the taxonomy.

## Output

Write `tools/data/style-briefs/_classify/judge.json`, merging into the file if
it exists:

```json
{
  "<slug>": {
    "<axis>": {
      "value": "",
      "reason": "One or two sentences citing the evidence or anchor.",
      "sources": ["s1"],
      "taxonomy_note": null
    }
  }
}
```

Validate the file parses as JSON. Reply with one line per ruling
(`slug.axis = value`) and any taxonomy notes.

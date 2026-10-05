# Opening families

Every one of the 12,377 positions belongs to one of 31 opening families (or to
`uncategorised`). A family is more than a label. Four things read it:

- **The video and study shelf.** A page with no videos or studies of its own
  shows its family's best ones instead, pooled from every position in the family
  (`packages/api/src/services/family-resource-service.js`). This is the consumer
  that makes a bad family visible.
- **Browse's family filter** (`/?family=<id>`, `BrowseService`, `FamilyPicker`).
- **Personal stats**, which roll a player's openings up by family.
- **`/api/families`**, which lists the families with their opening counts.

Families have no pages of their own: no URL, no sitemap entry, nothing in the
`seo-lookup` shards. A family change does not touch the crawl graph.

## The files

| File                                   | What it is                                                    |
| -------------------------------------- | ------------------------------------------------------------- |
| `data/families.json`                   | The 31 families: id, display name, slug, ECO anchor, blurb    |
| `api/data/families.json`               | A copy of the above, which the API reads. Keep them identical |
| `data/family-overrides.json`           | The rules that assign positions to families                   |
| `resolve-family.js`                    | Applies those rules to one opening                            |
| `build-family-index.js`                | Writes `family_id` into every `api/data/eco/eco{A..E}.json`   |
| `api/data/family-coverage-report.json` | Counts per family, written by the build                       |

## How a position gets its family

`resolve-family.js` tries, in order:

1. **The overrides, top to bottom. The first match wins.** A rule matches on
   `name_prefix`, an exact `name`, an `eco` code, or a combination (all must
   match).
2. **The opening's name up to its first colon**, compared with each family's
   display name. "Sicilian Defense: Najdorf Variation" finds `sicilian` this
   way.
3. Otherwise **`uncategorised`**, which gets no shelf.

## Changing a family or a rule

```bash
# 1. Edit data/families.json and/or data/family-overrides.json
cp data/families.json api/data/families.json      # if families.json changed
node tools/family-taxonomy/build-family-index.js  # rewrites the ECO files
npm run test:all
```

Commit the rewritten ECO files and the coverage report with the rule change. The
deploy (`scripts/prepare-vercel-data.js`) re-resolves from the rules anyway, so
a skipped rebuild ships correctly but leaves dev, tests and the report on the
old taxonomy. `tests/family-taxonomy-data.test.js` fails on that drift.

The Analyse sample reports (`packages/web/src/data/sample-reports/*.json`) carry
a `family_id` on each row. Remap those by FEN from the rebuilt ECO files rather
than regenerating them, unless you want new games too (see
`tools/sample-reports/README.md`).

## Three things that will trip you up

**Order is the whole rule.** Prefixes are greedy. A bare `Nimzowitsch` rule
placed above `Nimzowitsch-Larsen` takes the 1.b3 lines with it, and
`Queen's Pawn` swallows `Queen's Pawn: London` unless the London rule comes
first. Put the specific rule above the general one, and add a case to
`tests/family-taxonomy-data.test.js` for the name you meant to move.

**Moving positions into a family changes that family's shelf too.** Their videos
join the pool, ranked by match score. Filing the Danish under `scotch` would
have put five Danish and Latvian videos in the Scotch top 8. Before moving a
group into an existing family, compare the family's top 8 before and after, not
just the moved pages.

**A rule naming a missing family is silently skipped.** If an override's
`family_id` is not in `families.json`, the resolver ignores that rule and
carries on down the list, so the positions land somewhere else without an error.
The data test checks every override's target exists, so run it.

## What `irregular` means

`irregular` holds the flank and offbeat openings: Bird, Polish, Grob, Van Geet,
1.g3, 1.b3, the Englund and Budapest. Until 2026-10-02 it also held 1.e4, 1.d4
and every Queen's Pawn, King's Pawn and B00 sideline, 940 positions in all,
which made its shelf a grab-bag. The analysis behind the split, and the
alternatives rejected, are in
`docs/proposals/2026-10-02-irregular-family-split.md`.

Run directly, the build exits 1 when more than 2% of positions are
`uncategorised`. The deploy's prepare step runs it with that gate off, and
`tests/build-family-index.test.js` enforces the same 2% in CI.

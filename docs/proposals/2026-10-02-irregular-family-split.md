# Splitting the `irregular` family — so popular pages get a shelf that fits

**Status (2026-10-02):** proposed; the open questions are decided (see
**Decisions**). Implementation awaits the owner's go-ahead. No data or code has
changed. The counts below come from `main` at `34d8143`, with the video lists
from PR #157's branch (`feat/jev-video-filter` at `ad2718b`), because that is
the index this proposal would ship against.

## The problem

When a page has no videos of its own, the API serves a labelled family shelf
("Videos from the Irregular Openings family"). `FamilyResourceService` builds it
from every position with the same `family_id`: it deduplicates by video and
ranks by match score, then views. `irregular` holds 940 positions, from 1.e4
itself to the Grob, so its shelf is a grab-bag. These eight videos are what an
`irregular` page shows today:

| Score | Video                                              |
| ----- | -------------------------------------------------- |
| 190   | Nimzowitsch Defense: Declined Variation (St Louis) |
| 165   | Owen's Defense — Naroditsky speedrun               |
| 165   | The Dangerous Danish Gambit (St Louis)             |
| 165   | Indian Defense: Colle System — Naroditsky          |
| 165   | Latvian Gambit — Naroditsky                        |
| 165   | Nimzowitsch Defense Opening Theory (Hanging Pawns) |
| 165   | Bird Opening (Hanging Pawns)                       |
| 165   | Centre Game and Danish (Chessexplained)            |

The Chigorin page (1.d4 d5 2.Nc3) gets the same Nimzowitsch, Owen and Danish
videos, and so does the Horwitz.

## Two facts about the shelf that shape this proposal

1. **Only pages with no videos of their own show it.** So the useful measure is
   not how big `irregular` is, but how many popular pages with no own videos sit
   in it.
2. **A family's shelf is drawn from all its members.** So moving positions into
   an existing family does two things. The moved pages get that family's shelf.
   And the moved positions' own videos join that family's shelf, which can push
   out videos its existing pages rely on. Every option below was checked in both
   directions.

## What `irregular` holds

**940 of 12,377 positions** (7.6%). The family is assigned by
`tools/family-taxonomy/resolve-family.js` from `data/family-overrides.json`. The
stored `family_id` matches the resolver for all 12,377 positions, so simulating
a change to the overrides predicts what a rebuild would write.

**How to read the game counts.** `games_analyzed` counts every rated Lichess
game that reached a position, and positions nest: the 1.e4 page (3.78B games)
includes everything below it. So a sum over a group of pages is a measure of how
much those pages weigh, not a number of distinct games. The ranks below (`#7`)
are each position's place among all 12,377 by its own game count.

### By first move

| First move      | Pages | Pages with no own videos | Σ games on those pages |
| --------------- | ----: | -----------------------: | ---------------------: |
| 1.e4            |   293 |                      212 |                  1015M |
| 1.d4            |   302 |                      126 |                   683M |
| 1.g3            |    28 |                       28 |                   289M |
| 1.b3            |    19 |                       18 |                   160M |
| everything else |   298 |                      192 |                   230M |

### By ECO code (top 12 by Σ games)

| ECO | Pages | Σ games | Typical names                                            |
| --- | ----: | ------: | -------------------------------------------------------- |
| B00 |   125 |   4204M | King's Pawn Game (1.e4), Owen, Nimzowitsch, St George    |
| A40 |    74 |   2536M | Queen's Pawn Game (1.d4), Horwitz, Englund, Modern       |
| C20 |    36 |   1802M | King's Pawn Game (1.e4 e5), Leonardis, Wayward Queen     |
| D00 |    96 |   1243M | 1.d4 d5, Chigorin, Blackmar–Diemer, Accel. London        |
| C40 |    65 |   1051M | King's Knight Opening, Latvian, Elephant, Busch-Gass     |
| A00 |   225 |    903M | Hungarian, Van't Kruijs, Polish, Grob, Van Geet          |
| C44 |    10 |    600M | King's Knight Opening: Normal Variation (2…Nc6)          |
| D02 |    56 |    516M | Zukertort, Symmetrical, Chigorin, "Queen's Pawn: London" |
| A01 |    19 |    261M | Nimzo-Larsen                                             |
| C21 |    38 |    177M | Centre Game, Danish                                      |
| A06 |     5 |    163M | Queen's Pawn Game via 1.Nf3 d5 2.d4                      |
| A02 |    48 |    113M | Bird                                                     |

D03–D05 add 34 pages (Colle, Torre, Rubinstein Opening, 78M). E00 adds seven
"Queen's Pawn: Neo-Indian" pages (96M).

### By name prefix (top 15 by Σ games)

A prefix is the name up to its first colon or comma.

| Prefix (all variants)       | Pages | Σ games | No own videos (pages / Σ games) |
| --------------------------- | ----: | ------: | ------------------------------: |
| King's Pawn Game            |    46 |   5490M |                       36 / 162M |
| Queen's Pawn Game           |    69 |   3438M |                       36 / 279M |
| King's Knight Opening       |     7 |   1519M |                        5 / 593M |
| Queen's Pawn                |    91 |    728M |                       31 / 231M |
| Englund Gambit              |    20 |    265M |                         8 / 22M |
| Centre / Center Game        |    23 |    244M |                        16 / 29M |
| Nimzowitsch Defense/Defence |    64 |    208M |                       58 / 110M |
| Nimzo-Larsen Attack         |    18 |    203M |                       17 / 102M |
| Hungarian Opening (1.g3)    |    21 |    177M |                       21 / 177M |
| Bird                        |    90 |    175M |                        31 / 31M |
| Owen Defence/Defense        |    21 |    173M |                        18 / 85M |
| Horwitz Defense             |     2 |    163M |                        2 / 163M |
| Benko Opening (1.g3)        |     7 |    112M |                        7 / 112M |
| Blackmar-Diemer             |    59 |    109M |                        24 / 32M |
| Danish Gambit               |    24 |     64M |                         12 / 3M |

### How much of the site falls back to this shelf

| Measure                                          | `main` index | PR #157 index |
| ------------------------------------------------ | -----------: | ------------: |
| `irregular` pages with no own videos             |          540 |           576 |
| …of the top 200 positions                        |           15 |            20 |
| …of the top 1,000 positions                      |           80 |            93 |
| Top-1,000 pages with no own videos, all families |          238 |           272 |

So **about a third of the popular pages that fall back to a family shelf fall
back to `irregular`**. The Jev filter made this more visible, but did not cause
it.

These are the 20 top-200 pages that show it today:

| Rank | Page                                     | Moves                  | Games |
| ---: | ---------------------------------------- | ---------------------- | ----: |
|   #7 | King's Knight Opening: Normal Variation  | 1.e4 e5 2.Nf3 Nc6      |  593M |
|  #21 | Horwitz Defense                          | 1.d4 e6                |  163M |
|  #40 | Hungarian Opening                        | 1.g3                   |  108M |
|  #89 | Queen's Pawn Game: Symmetrical Variation | 1.d4 d5 2.Nf3 Nf6      |   57M |
| #105 | Queen's Pawn Game: Chigorin Variation    | 1.d4 d5 2.Nc3          |   47M |
| #106 | Queen's Pawn Game: Chigorin Variation    | 1.Nc3 d5 2.d4          |   47M |
| #109 | King's Pawn Game: Leonardis Variation    | 1.e4 e5 2.d3           |   46M |
| #142 | Queen's Pawn: Neo-Indian                 | 1.d4 Nf6 2.c4 e6 3.Nc3 |   35M |
| #154 | Queen's Pawn Game: Chigorin Variation    | 1.d4 d5 2.Nf3 Nc6      |   34M |
| #155 | Owen Defence                             | 1.e4 b6 2.d4           |   33M |
| #163 | Benko Opening                            | 1.g3 d5                |   31M |
| #167 | Queen's Pawn: Modern                     | 1.d4 g6 2.c4           |   30M |
| #168 | Owen Defence: 2.d4 Bb7                   | 1.e4 b6 2.d4 Bb7       |   30M |
| #181 | Benko Opening                            | 1.g3 d5 2.Bg2          |   28M |
| #185 | Queen's Pawn: Modern                     | 1.d4 g6 2.c4 Bg7       |   27M |
| #186 | Nimzo-Larsen Attack: Modern Variation    | 1.b3 e5                |   27M |
| #189 | King's Pawn Game: Busch-Gass Gambit      | 1.e4 e5 2.Nf3 Bc5      |   27M |
| #190 | Van 't Kruijs Opening                    | 1.e3 d5                |   27M |
| #191 | Queen's Pawn Game: Chigorin Variation    | 1.d4 Nf6 2.Nc3 d5      |   27M |
| #192 | Queen's Pawn: Veresov Attack             | 1.d4 d5 2.Nc3 Nf6      |   27M |

The biggest single case was not in the original brief. **1.e4 e5 2.Nf3 Nc6 is
the 7th most-played position on the site**, and its fallback is the `irregular`
grab-bag. It lands there only because the `King's Knight Opening` override sends
it there, while `Open Game`, `Four Knights` and `Two Knights` already go to
`italian`.

## Options tried

Each option was simulated with the real resolver and the real family index logic
against PR #157's video index.

**A. One new 1.d4 family and one new 1.e4 family.** The 1.d4 side works (see
below). The 1.e4 side does not. A single "King's Pawn Game" family's shelf is
Nimzowitsch, Owen, Danish, Latvian, Nimzowitsch, Centre Game, Elephant and
Danish. That is still a grab-bag, and it is what the #7 page would show.

**B. Move B00 and C20–C21 into existing families**, as the brief suggested. For
example, C20–C22 and C40 into `scotch`, and B00 into `pirc-modern`. This
pollutes both families:

- Scotch's top 8 takes in five Danish, Latvian and Elephant videos, and five
  Scotch videos drop out of it: a Sensei speedrun, the Scotch Gambit and
  Napoleon Gambit episodes, the Steinitz video and a general speedrun.
- Pirc & Modern's top 8 takes in the Nimzowitsch and Owen videos, displacing two
  Modern Defence theory videos.

Moving them into `italian` would leave Italian's shelf alone, because its videos
outscore them. But the moved pages would then show Urusov and Halloween Gambit
videos, which is no better than the grab-bag.

**C. Recommended:** three new families for groups that hang together, and six
narrow re-routes where an existing family already owns the opening by name.

## Recommendation

### Three new families

| id            | Display name          | Slug                    | Pages | No own videos | Σ games on those |
| ------------- | --------------------- | ----------------------- | ----: | ------------: | ---------------: |
| `queens-pawn` | Queen's Pawn Game     | `queens-pawn-game`      |   210 |            82 |             483M |
| `kings-pawn`  | King's Pawn Game      | `kings-pawn-game`       |   157 |            96 |             210M |
| `offbeat-e4`  | Offbeat 1.e4 Defenses | `offbeat-1-e4-defenses` |   110 |            99 |             209M |

The two "Pawn Game" names follow Lichess, which names the root positions 1.d4
and 1.e4 that way, and both roots move with their family. The B00 name uses
"Defense" to match the rest of the family list (see Decisions).

- **`queens-pawn`** — 1.d4 without the Queen's Gambit: 1.d4 and 1.d4 d5 roots,
  Zukertort, Symmetrical, Chigorin, Colle, Stonewall, Levitsky, Krause,
  Blackmar–Diemer, Rubinstein Opening, and Black's first-move alternatives such
  as Horwitz (1…e6), 1…c6 and 1…d6.
  - Shelf: Colle System ×4 (Naroditsky speedruns), Torre Attack, Queen's Pawn
    Master Class, Lemberger Countergambit, Levitsky Attack.
  - Chigorin, Horwitz and Symmetrical all get this shelf.
- **`kings-pawn`** — 1.e4 and 1.e4 e5 off the main roads: Leonardis, Napoleon,
  Wayward Queen/Parham, MacLeod, Busch-Gass, McConnell, Tayler, Centre Game,
  Danish, Latvian, Elephant, Portuguese.
  - Shelf: Danish ×4, Latvian ×2, Elephant ×2.
  - Gambit-heavy, but every video is about a 1.e4 e5 sideline.
- **`offbeat-e4`** — Owen (1…b6), Nimzowitsch (1…Nc6), St George (1…a6).
  - Shelf: Nimzowitsch ×2, Owen ×3, then three 1.e4 overviews ("Top 10 responses
    to 1.e4" and two repertoire videos).

### Six narrow re-routes into existing families

| Names                                                                                        | To             | Pages | No own videos | Effect on that family's top 8                                                                                        |
| -------------------------------------------------------------------------------------------- | -------------- | ----: | ------------: | -------------------------------------------------------------------------------------------------------------------- |
| `King's Knight Opening: Normal`, `…: Konstantinopolsky` (1.e4 e5 2.Nf3 Nc6 [3.g3])           | `italian`      |     2 |  1 (593M, #7) | unchanged                                                                                                            |
| `Queen's Pawn Game: Accelerated London`, `Queen's Pawn Game: London`, `Queen's Pawn: London` | `london`       |    16 |       9 (46M) | improves: five generic repertoire and speedrun videos give way to four London videos and a Morris Countergambit game |
| `Queen's Pawn Game: Modern`, `Queen's Pawn: Modern` (1.d4 g6)                                | `pirc-modern`  |    10 |      9 (111M) | unchanged                                                                                                            |
| `Queen's Pawn: Neo-Indian`, `Queen's Pawn: Anti-Nimzo-Indian` (1.d4 Nf6 2.c4 e6)             | `nimzo-indian` |     7 |       2 (37M) | unchanged                                                                                                            |
| `Queen's Pawn: Veresov`, `Queen's Pawn Game: Veresov` (added in Decisions)                   | `trompowsky`   |     6 |       3 (29M) | same eight; one Veresov video moves up a place                                                                       |
| `Queen's Pawn Game` with ECO B01 — a mislabelled 1.e4 d5 2.Nc3                               | `scandinavian` |     1 |             0 | unchanged                                                                                                            |

"Unchanged" means the same eight videos, in the same order, as today.

### Result

| Measure                                  | Today | Proposed |
| ---------------------------------------- | ----: | -------: |
| Positions in `irregular`                 |   940 |      421 |
| Top-200 pages on the `irregular` shelf   |    20 |        5 |
| Top-1,000 pages on the `irregular` shelf |    93 |       36 |
| Families                                 |    28 |       31 |
| `uncategorised` positions                |   192 |      192 |

### What stays in `irregular`, and why

What is left is mostly flank openings: Bird (89 pages), Polish, Van Geet, Grob,
1.g3, Larsen, Van't Kruijs, Kádas. It also keeps the offbeat 1.d4 defences
(Englund, Budapest, Mikenas, Borg) and the joke 1.e4 replies (Carr, Barnes,
Ware, Goldsmith). Its shelf becomes Bird, Englund ×3, Van't Kruijs, From's
Gambit, Horsefly and Larsen's Opening. That is what "Irregular Openings" should
mean.

- **The 1.g3 lines (Hungarian and Benko Opening) stay.** They are 289M of
  shelf-exposed weight, with three of them in the top 200, so they are the
  largest gap left. The obvious home, `kia`, is a poor one: its shelf has only
  12 videos, and four of its top eight are not KIA at all (a French repertoire,
  Kramnik endgames, two clock-handling episodes). Moving 1.g3 there would swap
  one wrong shelf for another. Fixing KIA's corpus is a separate job.
- **Englund and Budapest stay.** Moving them into `queens-pawn` would put two
  Englund videos (scores 165 and 160) into its top 8, on the Chigorin and
  Horwitz pages. Their own pages mostly have videos of their own, so they lose
  nothing by staying.

## Crawl, canonicals and other consumers

I read the `seo-crawl-graph` skill before writing this section. The brief
assumes family pages have URLs and sitemaps. **They don't today**, so a family
change does not touch the crawl graph:

- `STATIC_ROUTES` is `/`, `/analyse` and `/repertoire`. There is no `/family/…`
  route, and `slug` in `families.json` is not read by the web app.
- The sitemaps (`scripts/generate-sitemaps.js`) list only those static pages and
  `/opening/:fen`.
- The `seo-lookup` shard tuple carries no family. The "family root" in the
  pre-rendered breadcrumb is the root of the move tree (`TreeService`), not
  `family_id`.
- The middleware pre-render has no videos or shelf in it, so a changed shelf is
  invisible before hydration.
- Browse filters are `/?family=<id>` query strings. `/` passes through to
  `index.html`, whose canonical is `https://openingbook.xyz/`. So those URLs are
  not separate pages to Google, and an old `?family=irregular` link still works,
  with fewer results.

**One indirect SEO effect: sitemap `lastmod`.** `dataLastModified()` takes the
date of the last commit touching `api/data/eco`. Committing the rebuilt ECO
files would therefore stamp all 12,106 sitemap URLs as modified on that day,
although no page's pre-rendered content changes. This is harmless today, because
production omits `lastmod` (shallow clone). It becomes a false signal once the
build gets full history. Worth knowing; not a reason to block this.

Other places that read `family_id`:

| Consumer                                                    | Effect                                                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Browse family facet (`BrowseService`, `FamilyPicker`)       | 3 new facet values. Each new family's first move is >60% one move, so each gets a `first_move` badge; `irregular` stays mixed |
| `/api/families`                                             | 31 entries. Edge cache `s-maxage=86400`, so up to a day to appear                                                             |
| `FamilyResourceService`                                     | Builds its index once per process; picks the change up on deploy                                                              |
| Personal stats family rollups                               | A player's "Irregular Openings" row splits into up to four rows                                                               |
| `packages/web/src/data/sample-reports/{magnus,hikaru}.json` | Have `family_id` baked in (17 and 10 `irregular` rows); regenerate them                                                       |
| `tools/video-pipeline/lib/opening-families.js`, Jev filter  | Unaffected: separate taxonomy, and the Jev questions are keyed by opening name                                                |
| `prepare-vercel-data.js`                                    | Re-resolves families on every deploy from `data/`, so the overrides are what ship                                             |

## Implementation, after approval

Tests first, per `AGENTS.md`:

1. **Write the failing tests first.** Add cases to
   `tools/family-taxonomy/tests/resolve-family.test.js` that load the real
   `data/families.json` and `data/family-overrides.json`, and assert:
   - `Horwitz Defense`, `Queen's Pawn Game: Chigorin Variation`, `Colle: 3...c6`
     and `Blackmar-Diemer Gambit` → `queens-pawn`
   - `Queen's Pawn: London` → `london`
   - `Queen's Pawn: Veresov Attack` → `trompowsky`
   - `King's Knight Opening: Normal Variation` → `italian`
   - `King's Pawn Game: Leonardis Variation` and `Danish Gambit Accepted` →
     `kings-pawn`
   - `Owen Defence` and `Nimzowitsch Defense` → `offbeat-e4`
   - `Nimzowitsch-Larsen: 1...e5 2.Bb2` and `Bird Opening` stay `irregular`
   - `Queen's Pawn Game` with ECO B01 → `scandinavian`

   Confirm they fail, then commit them.

2. **Edit `data/family-overrides.json`.** Mostly this means changing the
   `family_id` on existing rules in place. Three ordering traps, each of which
   the simulation hit or nearly hit:
   - Add a new `Nimzowitsch Defen` rule. Do not retarget the bare `Nimzowitsch`
     rule: if it ever lands above `Nimzowitsch-Larsen`, it takes four 1.b3 pages
     with it (this happened in the simulation).
   - The London, Modern, Neo-Indian and Veresov rules must sit above
     `Queen's Pawn`.
   - The two `King's Knight Opening: …` → `italian` rules must sit above
     `King's Knight Opening`.
3. **Add the three entries to `data/families.json` and its copy
   `api/data/families.json`.** Draft short descriptions:
   - `queens-pawn`: "1.d4 without the Queen's Gambit — Colle, Zukertort,
     Chigorin and Blackmar–Diemer systems, and Black's first-move alternatives."
   - `kings-pawn`: "1.e4 e5 off the main roads — the Centre Game, Danish and
     Latvian gambits, and early queen sorties."
   - `offbeat-e4`: "Black sidesteps the main defences with 1…b6, 1…Nc6 or 1…a6 —
     the Owen, Nimzowitsch and St George."
4. **Rebuild and commit the generated files.** Run
   `node tools/family-taxonomy/build-family-index.js`, and commit the rewritten
   `api/data/eco/*.json` and `family-coverage-report.json`. Then regenerate the
   two sample reports.
5. **Verify:**
   - Run `npm run test:all` and `npm run build`.
   - Run `npm run build:vercel`, and confirm the sitemap URL set is unchanged.
   - Diff `family_counts` in the coverage report against the tables above.
6. **Docs:** a line in `tools/family-taxonomy` (there is no README yet) or
   `packages/api/AGENTS.md`, and a `progress.md` entry.

## Decisions

The owner left the open questions to judgement (2026-10-02). Each decision below
follows the site's own Lichess data, which is where the move shares come from.

1. **Name: "Offbeat 1.e4 Defenses".** Opening names keep the spelling they are
   commonly known by, so "Defense" is right here, as it is for every other
   family in the picker ("Sicilian Defense", "French Defense"). British English
   still applies to prose, such as the family descriptions. "Offbeat" is how
   coaches and repertoire books describe 1…b6, 1…Nc6 and 1…a6.
2. **Two 1.e4 families, not one.** In chess terms they are different things. The
   Owen, Nimzowitsch and St George are Black declining 1…e5 and 1…c5 on move
   one. The Danish, Latvian, Centre Game and Leonardis come after 1.e4 e5. A
   Danish video does nothing for an Owen player. The extra family is what gives
   each shelf a single subject.
3. **1.e4 e5 2.Nf3 Nc6 → `italian`.** After 2…Nc6, Lichess games go 3.Bc4 42%,
   3.Bb5 21%, 3.d4 17% and 3.Nc3 13%. The repo's `italian` family already holds
   the Two Knights, Three Knights, Four Knights, Ponziani and "Open Game", so
   60% of the games from this position stay inside the family whose shelf it
   gets.
4. **Neo-Indian → `nimzo-indian`.** After 1.d4 Nf6 2.c4 e6, 3.Nc3 is 64%, and
   after 3.Nc3, 3…Bb4 is 81%. The Catalan (3.g3) is 3%. Its E00 ECO band is a
   catalogue accident, not a reason.
5. **1.d4 g6 → `pirc-modern`.** After 1.d4 g6 2.c4 Bg7 3.Nc3, 3…d6 is 81%, and
   Lichess already names that position "Modern Defense" and files it in
   `pirc-modern`. That family's top 8 includes "The Averbakh System | Modern
   Defense", which is exactly this structure once White plays e4. Routing these
   lines to `kings-indian` would split one opening across two families.
6. **Added on review: Veresov → `trompowsky`.** The overrides already send
   `Richter-Veresov` to `trompowsky`, but the six `Queen's Pawn: Veresov…` and
   `Queen's Pawn Game: Veresov…` names would have gone to `queens-pawn`,
   splitting one opening across two families. On the Veresov Attack page (#192,
   1.d4 d5 2.Nc3 Nf6, 27M games, no own videos), Trompowsky's shelf carries four
   Veresov videos where the `queens-pawn` shelf carries none. Trompowsky's top 8
   keeps the same videos, and `queens-pawn` loses none of its own. This takes
   `queens-pawn` to 210 positions; the result table is unchanged.

**The weakest fit that remains is the Horwitz.** After 1.d4 e6, 2.c4 is 64%, and
it leads to the QGD, Dutch, Nimzo-Indian or a French by transposition, none of
which the Colle-heavy `queens-pawn` shelf covers. It stays there anyway: no
single family fits a move whose point is to keep every option open, and Black's
other first-move alternatives (1…c6, 1…d6) sit in the same family.

**Still out of scope:**

- The 192 `uncategorised` positions get no shelf at all.
- KIA's own shelf is contaminated, which is why 1.g3 stays in `irregular`.
- The Torre Attack still goes to `london`.

## How the counts were made

1. Joined `api/data/eco/eco{A..E}.json` to
   `api/data/popularity_stats.json → positions[fen].games_analyzed`.
2. Took "own videos" from PR #157's `api/data/video-index.json`, read through
   `getAllPositions`.
3. Re-ran `createResolver` with each candidate's rules added ahead of the
   current overrides, then rebuilt each family's shelf with
   `FamilyResourceService`'s rule: dedupe by video id, keep the best-scored
   copy, sort by score then views, take the top 8.

The scripts were throwaway and are not committed. Step 1 of the implementation
re-checks the result.

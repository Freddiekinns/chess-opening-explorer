# Content review

Every opening page's description and plans were written by an LLM, and the
researched style briefs found wrong claims in a third of the pages they audited.
Rather than audit all 12,377 pages, this reviews the pages people actually
visit, 50 at a time, and records each review so nothing is done twice (#208).

## Files

| File                                       | What it is                                                         |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `data/content-review/ledger.json`          | One entry per reviewed FEN: `reviewedAt`, `verdict`, `contentHash` |
| `data/content-review/views/<date>.json`    | An export of `/opening/…` page views, the queue's input            |
| `data/content-review/batches/<date>.json`  | The ranked pages picked for a review, with each page's verdict     |
| `tools/content-review/ledger.js`           | Hashing, the due rule, ranking, the move check                     |
| `queue.js`, `sheet.js`, `record.js` (here) | The three steps below                                              |

A page is **due** when it has no ledger entry, when its description or plans
changed after the review (`contentHash` no longer matches), or when the review
is 12 months old. The verdicts are `ok`, `fixed` and `needs-research`; the last
two need notes saying what was wrong or what is still unknown.

The ledger was seeded with the 105 root pages the researched style briefs
audited claim by claim, dated 2026-10-11, when #171 fixed the 43 wrong claims on
32 of them.

## Running a batch

Monthly, or whenever enough new pages have been visited.

1. **Export the views.** PostHog has no export button for this; query it in the
   signed-in browser on eu.posthog.com (project 283180) by POSTing HogQL to
   `/api/projects/@current/query/` with the `posthog_csrftoken` cookie as
   `X-CSRFToken`:

   ```sql
   select properties.$pathname as p, count() as views, count(distinct person_id) as people
   from events
   where event = '$pageview' and properties.$pathname like '/opening/%'
     and properties.$host = 'openingbook.xyz'
     and not (startsWith(toString(properties.$device_id), 'c21e0f5c')
           or startsWith(toString(properties.$device_id), 'a51c7e4c'))
     and timestamp >= toDateTime('<since>')
   group by p order by views desc
   ```

   Raw HogQL ignores the test-account filter, hence the two device IDs. Save the
   rows as `data/content-review/views/<today>.json`:
   `{ "source", "since", "until", "pages": [{ "path", "views", "people" }] }`.
   Once the #188 monthly report lists the opening pages viewed, use that
   instead.

2. **Build the batch.**
   `node tools/content-review/queue.js --views data/content-review/views/<today>.json --write`
   ranks due pages by distinct people, then views, takes the top 50 and writes
   the batch file. Paths that match no ECO record are listed and skipped: they
   are positions reached by transposition, or old link shapes, with no text to
   review. Positions are matched on board, side, castling and en passant, so
   links with other move counters still count.

3. **Review each page.**
   `node tools/content-review/sheet.js <batch> --from 1 --to 8` prints the
   board, the text, the move sequences that fail to replay, and the style
   brief's overview where one exists. Check that:
   - every move sequence in the text replays legally (the sheet does this; a
     sequence numbered past the end of the opening's moves is flagged for a
     check by hand, and is usually a sentence that continues an earlier one);
   - the text is about this variation, not a neighbour, and agrees with the
     moves;
   - piece-and-square claims hold on the board: which bishop is light- or
     dark-squared, which files are open, whether a pawn the text names exists;
   - the plans agree with the style brief where there is one.

   The first batch's errors were nearly all of the third kind (Bf4 and Bb2
   called light-squared, a g7-bishop pressing a d4-pawn that isn't there, Nf3
   suggested after 1.f3), plus three pages that misread the whole position: a
   line where Black hangs the queen described as Black seizing the initiative, a
   queen sacrifice described as a queen trade, and a mating trap described as if
   the victim were winning.

4. **Fix and record.** Edit the wrong field in `api/data/eco/` as a narrow,
   one-line change, in British English. Set each page's `verdict` and `notes` in
   the batch file, then run `node tools/content-review/record.js <batch>`. It
   hashes the text as it stands, so run it after the fixes. Pages left with a
   null verdict stay due.

5. **Commit the batch in one commit**: the views export, the batch file, the
   ledger and the ECO fixes together, with the owner approving the fixes first.

## History

| Batch      | Views since | Pages | Fixed | Notes                              |
| ---------- | ----------- | ----- | ----- | ---------------------------------- |
| 2026-11-01 | 2026-09-24  | 50    | 17    | 142 paths, 132 pages; 76 still due |
| 2026-11-02 | 2026-09-24  | 50    | 18    | 147 paths, 137 pages; 31 still due |

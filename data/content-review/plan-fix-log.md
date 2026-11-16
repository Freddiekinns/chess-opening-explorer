# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); 4,151 at the 02:10 UTC refresh; 4,108 on 3,215 pages at the 02:33 refresh (after batch 5); 4,035 on 3,155 pages at the 02:55 refresh (after batch 10); 3,976 on 3,105 pages at the 07:15 refresh (after batch 16); 3,928 on 3,065 pages at the 07:40 refresh (after batch 20); 3,834 on 2,985 pages at the 08:10 refresh (after batch 28); 3,750 on 2,915 pages at the 08:38 refresh (after batch 35); 3,684 on 2,860 pages at the 12:10 refresh (after batch 40); 3,628 on 2,816 pages at the 12:38 refresh (after batch 46); about 3,490 after batch 55; 3,496 on 2,717 pages at the 2026-11-15 19:12 refresh, after merging the feat/228 parser change that reads a hyphenated route whole (batch files from 2026-11-15 are numbered from 1); 3,445 on 2,678 pages at the 19:33 refresh (after batch 2026-11-15-4); 3,393 on 2,638 pages at the 19:46 refresh (after batch 2026-11-15-8); 3,349 on 2,598 pages at the 20:04 refresh (after batch 2026-11-15-12); 3,300 on 2,558 pages at the 20:24 refresh (after batch 2026-11-15-16); 3,265 on 2,528 pages at the 20:39 refresh (after batch 2026-11-15-19); 3,203 on 2,488 pages at the 21:00 refresh (after batch 2026-11-15-23); 3,149 on 2,449 pages at the 2026-11-16 00:10 refresh (batch files from 2026-11-16 are numbered from 1); 3,061 on 2,373 pages at the 2026-11-16 00:38 refresh (after batch 2026-11-16-8); 2,965 on 2,301 pages at the 00:59 refresh (after batch 2026-11-16-15); 2,869 on 2,227 pages at the 01:19 refresh (after batch 2026-11-16-23); 2,834 on 2,199 pages at the 02:10 refresh (after batch 2026-11-16-27); 2,818 on 2,187 pages at the 2026-11-16 05:10 refresh; 2,721 on 2,108 pages at the 05:35 refresh (after batch 2026-11-16-36; the refresh commit subject misstates it as 2,729 on 2,115)
- Phase 1 pages left: about 2,046, skips excluded
- Pages reviewed by this job: 1,265 (including thirty-five follow-ups to earlier batches)
- Phase: 1

## Batches

| UTC              | Phase | Pages | Fixed / ok / needs-research | Reviewer accept / reject | Parser changes |
| ---------------- | ----- | ----- | --------------------------- | ------------------------ | -------------- |
| 2026-11-09 01:40 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (fixed, re-accepted) | none        |
| 2026-11-09 02:12 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none        |
| 2026-11-09 02:22 | 1     | 10    | 10 / 0 / 0                  | 18 / 4 (fixed, re-accepted) | none; 1 skip added |
| 2026-11-09 02:28 | 1     | 10    | 10 / 0 / 0                  | 18 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 02:31 | 1     | 10    | 9 / 0 / 1                   | 18 / 0                   | none; 1 skip added |
| 2026-11-09 02:40 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none |
| 2026-11-09 02:39 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none |
| 2026-11-09 02:44 | 1     | 10    | 10 / 0 / 0                  | 18 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 02:47 | 1     | 10    | 10 / 0 / 0                  | 16 / 4 (fixed, re-accepted) | none |
| 2026-11-09 02:52 | 1     | 10    | 10 / 0 / 0                  | 17 / 3 (fixed, re-accepted) | none |
| 2026-11-09 02:56 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed twice, re-accepted) | none |
| 2026-11-09 03:00 | 1     | 11    | 11 / 0 / 0                  | 18 / 2 (fixed, re-accepted) | none; includes a fix to a batch-3 page |
| 2026-11-09 03:06 | 1     | 10    | 10 / 0 / 0                  | 18 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 03:10 | 1     | 10    | 10 / 0 / 0                  | 15 / 5 (fixed, re-accepted) | none |
| 2026-11-09 03:15 | 1     | 10    | 10 / 0 / 0                  | 16 / 4 (fixed, re-accepted) | none |
| 2026-11-09 03:20 | 1     | 11    | 11 / 0 / 0                  | 15 / 6 (fixed, re-accepted) | none; includes a fix to a batch-14 page |
| 2026-11-09 07:19 | 1     | 10    | 10 / 0 / 0                  | 38 / 0                   | none |
| 2026-11-09 07:24 | 1     | 10    | 10 / 0 / 0                  | 26 / 3 (fixed, re-accepted) | none |
| 2026-11-09 07:29 | 1     | 10    | 10 / 0 / 0                  | 30 / 2 (1 plan reverted to old text) | none |
| 2026-11-09 07:34 | 1     | 10    | 10 / 0 / 0                  | 34 / 3 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 07:39 | 1     | 10    | 10 / 0 / 0                  | 26 / 2 (fixed, re-accepted) | none |
| 2026-11-09 07:43 | 1     | 10    | 10 / 0 / 0                  | 28 / 1 (fixed, re-accepted) | none |
| 2026-11-09 07:47 | 1     | 10    | 10 / 0 / 0                  | 31 / 0                   | none |
| 2026-11-09 07:51 | 1     | 10    | 10 / 0 / 0                  | 38 / 1 (fixed, re-accepted) | none |
| 2026-11-09 07:55 | 1     | 10    | 10 / 0 / 0                  | 29 / 4 (fixed, re-accepted) | none |
| 2026-11-09 07:59 | 1     | 10    | 10 / 0 / 0                  | 36 / 0                   | none |
| 2026-11-09 08:03 | 1     | 10    | 10 / 0 / 0                  | 31 / 2 (fixed, re-accepted) | none |
| 2026-11-09 08:07 | 1     | 10    | 10 / 0 / 0                  | 29 / 1 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 08:11 | 1     | 10    | 10 / 0 / 0                  | 34 / 2 (fixed, re-accepted) | none |
| 2026-11-09 08:14 | 1     | 10    | 10 / 0 / 0                  | 34 / 0                   | none |
| 2026-11-09 08:18 | 1     | 10    | 10 / 0 / 0                  | 30 / 3 (fixed, re-accepted) | none |
| 2026-11-09 08:22 | 1     | 10    | 10 / 0 / 0                  | 31 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 08:25 | 1     | 10    | 10 / 0 / 0                  | 33 / 0                   | none |
| 2026-11-09 08:29 | 1     | 10    | 10 / 0 / 0                  | 30 / 2 (fixed, re-accepted) | none |
| 2026-11-09 08:32 | 1     | 10    | 10 / 0 / 0                  | 32 / 1 (fixed, re-accepted) | none |
| 2026-11-09 08:36 | 1     | 10    | 10 / 0 / 0                  | 33 / 3 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 08:40 | 1     | 10    | 10 / 0 / 0                  | 31 / 1 (fixed, re-accepted) | none |
| 2026-11-09 08:44 | 1     | 10    | 9 / 0 / 1                   | 33 / 2 (1 plan reverted, needs-research) | none; 1 skip added |
| 2026-11-09 08:48 | 1     | 10    | 10 / 0 / 0                  | 30 / 1 (fixed, re-accepted) | none |
| 2026-11-09 08:51 | 1     | 10    | 10 / 0 / 0                  | 36 / 1 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 12:16 | 1     | 10    | 10 / 0 / 0                  | 32 / 1 (fixed, re-accepted) | none |
| 2026-11-09 12:20 | 1     | 10    | 10 / 0 / 0                  | 38 / 1 (fixed, re-accepted) | none |
| 2026-11-09 12:25 | 1     | 10    | 10 / 0 / 0                  | 32 / 2 (fixed, re-accepted) | none |
| 2026-11-09 12:29 | 1     | 10    | 10 / 0 / 0                  | 34 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 12:33 | 1     | 10    | 10 / 0 / 0                  | 29 / 5 (fixed, re-accepted) | none |
| 2026-11-09 12:37 | 1     | 10    | 10 / 0 / 0                  | 36 / 0                   | none |
| 2026-11-09 12:42 | 1     | 10    | 10 / 0 / 0                  | 36 / 1 (fixed, re-accepted) | none |
| 2026-11-09 12:46 | 1     | 10    | 10 / 0 / 0                  | 35 / 1 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 788 Vitest) |
| 2026-11-09 12:50 | 1     | 10    | 9 / 0 / 1                   | 31 / 3 (2 fixed, re-accepted; 1 plan restored, needs-research) | none |
| 2026-11-09 12:55 | 1     | 10    | 10 / 0 / 0                  | 24 / 2 (fixed, re-accepted) | none |
| 2026-11-09 12:59 | 1     | 10    | 10 / 0 / 0                  | 35 / 5 (fixed, re-accepted) | none |
| 2026-11-09 13:03 | 1     | 10    | 10 / 0 / 0                  | 35 / 1 (fixed, re-accepted) | none |
| 2026-11-09 13:07 | 1     | 10    | 10 / 0 / 0                  | 29 / 2 (fixed, re-accepted) | none |
| 2026-11-09 13:11 | 1     | 10    | 10 / 0 / 0                  | 29 / 7 (fixed, re-accepted) | none |
| 2026-11-09 13:15 | 1     | 10    | 10 / 0 / 0                  | 32 / 4 (fixed, re-accepted) | none |
| 2026-11-15 19:16 | 1     | 10    | 9 / 1 / 0                   | 14 / 2 (fixed, re-accepted) | none; 1 skip added |
| 2026-11-15 19:20 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none |
| 2026-11-15 19:24 | 1     | 10    | 10 / 0 / 0                  | 19 / 2 (fixed, re-accepted) | none |
| 2026-11-15 19:29 | 1     | 10    | 10 / 0 / 0                  | 17 / 2 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-15 19:34 | 1     | 13    | 13 / 0 / 0                  | 26 / 4 (fixed, re-accepted) | none; includes 3 follow-ups to batch 2026-11-15-4 |
| 2026-11-15 19:37 | 1     | 10    | 10 / 0 / 0                  | 18 / 1 (fixed, re-accepted) | none |
| 2026-11-15 19:41 | 1     | 10    | 10 / 0 / 0                  | 26 / 0                   | none |
| 2026-11-15 19:45 | 1     | 10    | 10 / 0 / 0                  | 18 / 4 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-15 19:49 | 1     | 10    | 10 / 0 / 0                  | 13 / 2 (fixed, re-accepted) | none |
| 2026-11-15 19:54 | 1     | 10    | 10 / 0 / 0                  | 19 / 4 (fixed, re-accepted) | none |
| 2026-11-15 19:57 | 1     | 10    | 10 / 0 / 0                  | 15 / 2 (fixed, re-accepted) | none |
| 2026-11-15 20:03 | 1     | 10    | 9 / 0 / 1                   | 16 / 4 (3 fixed, re-accepted; 1 plan left as it was, needs-research) | none |
| 2026-11-15 20:10 | 1     | 10    | 10 / 0 / 0                  | 19 / 4 (fixed, re-accepted) | none |
| 2026-11-15 20:15 | 1     | 10    | 10 / 0 / 0                  | 20 / 1 (fixed, re-accepted) | none |
| 2026-11-15 20:20 | 1     | 10    | 10 / 0 / 0                  | 17 / 2 (fixed, re-accepted) | none |
| 2026-11-15 20:23 | 1     | 10    | 10 / 0 / 0                  | 15 / 0                   | none |
| 2026-11-15 20:27 | 1     | 10    | 10 / 0 / 0                  | 14 / 1 (fixed, re-accepted) | none |
| 2026-11-15 20:32 | 1     | 10    | 10 / 0 / 0                  | 18 / 2 (fixed, re-accepted) | none |
| 2026-11-15 20:37 | 1     | 10    | 10 / 0 / 0                  | 14 / 2 (fixed, re-accepted) | none |
| 2026-11-15 20:43 | 1     | 10    | 10 / 0 / 0                  | 21 / 1 (fixed, re-accepted) | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-15 20:48 | 1     | 10    | 10 / 0 / 0                  | 26 / 1 (fixed, re-accepted) | none |
| 2026-11-15 20:53 | 1     | 10    | 10 / 0 / 0                  | 17 / 2 (fixed, re-accepted) | none |
| 2026-11-15 20:59 | 1     | 10    | 10 / 0 / 0                  | 23 / 1 (fixed, re-accepted) | none |
| 2026-11-15 21:03 | 1     | 10    | 10 / 0 / 0                  | 24 / 0                   | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-15 21:08 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none |
| 2026-11-15 21:12 | 1     | 10    | 10 / 0 / 0                  | 16 / 1 (fixed, re-accepted) | none |
| 2026-11-15 21:18 | 1     | 10    | 10 / 0 / 0                  | 22 / 4 (fixed, re-accepted) | none |
| 2026-11-16 00:19 | 1     | 10    | 10 / 0 / 0                  | 27 / 2 (fixed, re-accepted) | none |
| 2026-11-16 00:19 | 1     | 10    | 10 / 0 / 0                  | 22 / 0                   | none |
| 2026-11-16 00:22 | 1     | 10    | 10 / 0 / 0                  | 22 / 0                   | none |
| 2026-11-16 00:25 | 1     | 10    | 10 / 0 / 0                  | 19 / 0                   | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-16 00:28 | 1     | 10    | 10 / 0 / 0                  | 18 / 1 (held for re-review in batch 6) | none |
| 2026-11-16 00:32 | 1     | 11    | 11 / 0 / 0                  | 22 / 1 (held for re-review in batch 7) | none; includes a follow-up to a batch-5 page |
| 2026-11-16 00:35 | 1     | 11    | 11 / 0 / 0                  | 22 / 2 (held for re-review in batch 9) | none; includes a follow-up to a batch-6 page |
| 2026-11-16 00:37 | 1     | 10    | 10 / 0 / 0                  | 18 / 1 (held for re-review in batch 9) | none; `npm run test:all` passed (1,203 Jest, 819 Vitest, pre-push hook) |
| 2026-11-16 00:41 | 1     | 13    | 13 / 0 / 0                  | 18 / 2 (held for re-review in batch 11) | none; includes three follow-ups to batches 7-8 |
| 2026-11-16 00:42 | 1     | 10    | 10 / 0 / 0                  | 14 / 0                   | none |
| 2026-11-16 00:46 | 1     | 12    | 12 / 0 / 0                  | 24 / 1 (held for re-review in batch 12) | none; includes two follow-ups to batch 9 |
| 2026-11-16 00:48 | 1     | 11    | 11 / 0 / 0                  | 15 / 2 (held for re-review in batch 13) | none; includes a follow-up to batch 11; `npm run test:all` passed (pre-push hook) |
| 2026-11-16 00:51 | 1     | 13    | 12 / 0 / 1                  | 18 / 1 (second rejection: old text kept, needs-research) | none; 1 skip added; includes three follow-ups to batch 12 |
| 2026-11-16 00:53 | 1     | 10    | 10 / 0 / 0                  | 17 / 1 (held for re-review in batch 15) | none |
| 2026-11-16 00:56 | 1     | 11    | 10 / 0 / 1                  | 20 / 2 (1 held for re-review in batch 16; 1 second rejection, old text kept) | none; includes a follow-up to batch 14 |
| 2026-11-16 00:58 | 1     | 11    | 11 / 0 / 0                  | 23 / 0                   | none; includes a follow-up to batch 15; `npm run test:all` passed (pre-push hook) |
| 2026-11-16 01:01 | 1     | 10    | 10 / 0 / 0                  | 23 / 0                   | none |
| 2026-11-16 01:03 | 1     | 10    | 10 / 0 / 0                  | 15 / 3 (held for re-review in batch 19) | none |
| 2026-11-16 01:06 | 1     | 13    | 13 / 0 / 0                  | 19 / 2 (held for re-review in batch 21) | none; includes three follow-ups to batch 18 |
| 2026-11-16 01:07 | 1     | 10    | 10 / 0 / 0                  | 14 / 0                   | none; `npm run test:all` passed (pre-push hook) |
| 2026-11-16 01:10 | 1     | 12    | 12 / 0 / 0                  | 24 / 2 (held for re-review in batch 22) | none; includes two follow-ups to batch 19 |
| 2026-11-16 01:13 | 1     | 12    | 11 / 0 / 1                  | 16 / 2 (1 held for batch 23; 1 second rejection, old text kept) | none; 1 skip added; includes two follow-ups to batch 21 |
| 2026-11-16 01:15 | 1     | 11    | 10 / 0 / 1                  | 16 / 4 (held for re-review in batch 24) | none; includes a follow-up to batch 22 |
| 2026-11-16 01:20 | 1     | 14    | 13 / 0 / 1                  | 15 / 4 (3 held for batch 26; 1 second rejection, old text kept) | none; includes four follow-ups to batch 23; `npm run test:all` passed (pre-push hook) |
| 2026-11-16 01:20 | 1     | 10    | 10 / 0 / 0                  | 15 / 3 (held for re-review in batch 26) | none |
| 2026-11-16 01:22 | 1     | 5     | 4 / 0 / 1                   | 5 / 1 (second rejection, old text kept) | none; follow-ups to batches 24-25 only |
| 2026-11-16 01:25 | 1     | 10    | 10 / 0 / 0                  | 8 / 4 (fixed, re-accepted) | none |
| 2026-11-16 02:30 | 1     | 10    | 10 / 0 / 0                  | 21 / 0                   | none; 3 skips added for earlier needs-research pages |
| 2026-11-16 05:14 | 1     | 10    | 10 / 0 / 0                  | 30 / 2 (fixed, re-accepted) | none |
| 2026-11-16 05:15 | 1     | 10    | 10 / 0 / 0                  | 17 / 2 (fixed, re-accepted) | none |
| 2026-11-16 05:19 | 1     | 10    | 10 / 0 / 0                  | 20 / 2 (fixed, re-accepted) | none |
| 2026-11-16 05:23 | 1     | 10    | 9 / 0 / 1                   | 22 / 4 (3 fixed and re-accepted; 1 second rejection, old text kept) | none; 1 skip added; `npm run test:all` passed via verifier (1,203 Jest, 819 Vitest) |
| 2026-11-16 05:25 | 1     | 10    | 10 / 0 / 0                  | 20 / 1 (fixed, re-accepted) | none |
| 2026-11-16 05:28 | 1     | 10    | 10 / 0 / 0                  | 20 / 0                   | none |
| 2026-11-16 05:30 | 1     | 10    | 10 / 0 / 0                  | 19 / 2 (fixed, re-accepted) | none |
| 2026-11-16 05:31 | 1     | 10    | 9 / 0 / 1                   | 20 / 3 (2 fixed and re-accepted; 1 second rejection, old text kept) | none |
| 2026-11-16 05:35 | 1     | 0     | -                           | -                        | refresh only; `npm run test:all` passed via verifier after batch 36 (1,203 Jest, 819 Vitest) |
| 2026-11-16 05:42 | 1     | 10    | 10 / 0 / 0                  | 25 / 2 (fixed, re-accepted) | none (batch 37) |
| 2026-11-16 05:42 | 1     | 10    | 10 / 0 / 0                  | 20 / 0                   | none (batch 39; batch 38 committed next) |
| 2026-11-16 05:42 | 1     | 10    | 10 / 0 / 0                  | 29 / 2 (fixed, re-accepted) | none (batch 38) |
| 2026-11-16 05:46 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (spelling, fixed) | none (batch 40) |
| 2026-11-16 05:48 | 1     | 10    | 10 / 0 / 0                  | 15 / 2 (fixed, re-accepted) | none (batch 41) |

# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); 4,151 at the 02:10 UTC refresh; 4,108 on 3,215 pages at the 02:33 refresh (after batch 5); 4,035 on 3,155 pages at the 02:55 refresh (after batch 10); 3,976 on 3,105 pages at the 07:15 refresh (after batch 16); 3,928 on 3,065 pages at the 07:40 refresh (after batch 20); 3,834 on 2,985 pages at the 08:10 refresh (after batch 28); 3,750 on 2,915 pages at the 08:38 refresh (after batch 35); 3,684 on 2,860 pages at the 12:10 refresh (after batch 40); 3,628 on 2,816 pages at the 12:38 refresh (after batch 46); about 3,490 after batch 55; 3,496 on 2,717 pages at the 2026-11-15 19:12 refresh, after merging the feat/228 parser change that reads a hyphenated route whole (batch files from 2026-11-15 are numbered from 1); 3,445 on 2,678 pages at the 19:33 refresh (after batch 2026-11-15-4); 3,393 on 2,638 pages at the 19:46 refresh (after batch 2026-11-15-8); 3,349 on 2,598 pages at the 20:04 refresh (after batch 2026-11-15-12); 3,300 on 2,558 pages at the 20:24 refresh (after batch 2026-11-15-16); 3,265 on 2,528 pages at the 20:39 refresh (after batch 2026-11-15-19); 3,203 on 2,488 pages at the 21:00 refresh (after batch 2026-11-15-23); 3,149 on 2,449 pages at the 2026-11-16 00:10 refresh (batch files from 2026-11-16 are numbered from 1); 3,061 on 2,373 pages at the 2026-11-16 00:38 refresh (after batch 2026-11-16-8); 2,965 on 2,301 pages at the 00:59 refresh (after batch 2026-11-16-15); 2,869 on 2,227 pages at the 01:19 refresh (after batch 2026-11-16-23); 2,834 on 2,199 pages at the 02:10 refresh (after batch 2026-11-16-27); 2,818 on 2,187 pages at the 2026-11-16 05:10 refresh; 2,721 on 2,108 pages at the 05:35 refresh (after batch 2026-11-16-36; the refresh commit subject misstates it as 2,729 on 2,115); 2,661 on 2,058 pages at the 05:51 refresh (after batch 2026-11-16-41); 2,579 on 1,989 pages at the 06:14 refresh (after batch 2026-11-16-48); 2,493 on 1,921 pages at the 2026-11-16 10:10 refresh (after batch 2026-11-16-55); 2,405 on 1,852 pages at the 10:40 refresh (after batch 2026-11-16-62); 2,333 on 1,794 pages at the 2026-11-16 11:10 refresh (after batch 2026-11-16-68); 2,221 on 1,707 pages at the 2026-11-16 11:55 refresh (after batch 2026-11-16-76); 2,221 on 1,707 pages at the 2026-11-22 19:15 refresh (start of a new run; batch files from 2026-11-22 are numbered from 1); 2,192 on 1,680 pages at the 2026-11-22 19:35 refresh (after batch 2026-11-22-3); 2,157 on 1,651 pages at the 2026-11-22 19:47 refresh (after batch 2026-11-22-6); 2,104 on 1,613 pages at the 2026-11-22 20:12 refresh (start of a new run, after batch 2026-11-22-10); 2,025 on 1,554 pages at the 2026-11-22 20:40 refresh (after batch 2026-11-22-16); 1,975 on 1,515 pages at the 2026-11-22 21:15 refresh (start of a new run); 1,888 on 1,446 pages at the 2026-11-22 21:55 refresh (after batch 2026-11-22-27); 1,848 on 1,416 pages at the 2026-11-22 22:15 refresh (start of a new run); 1,791 on 1,376 pages at the 2026-11-22 23:10 refresh (start of a new run); 1,722 on 1,326 pages at the 2026-11-23 03:10 refresh (start of a new run; batch files from 2026-11-23 are numbered from 1); 1,651 on 1,277 pages at the 2026-11-23 03:41 refresh (after batch 2026-11-23-5); 1,638 on 1,267 pages at the 2026-11-23 04:08 refresh (start of a new run); 1,576 on 1,227 pages at the 2026-11-23 04:30 refresh (after batch 2026-11-23-10); 1,497 on 1,169 pages at the 2026-11-23 05:07 refresh (start of a new run); 1,400 on 1,099 pages at the 2026-11-23 05:45 refresh (after batch 2026-11-23-23); 1,386 on 1,089 pages at the 2026-11-23 08:10 refresh (start of a new run); 1,328 on 1,040 pages at the 2026-11-23 08:41 refresh (after batch 2026-11-23-29)
- Phase 1 pages left: about 965, skips excluded
- Pages reviewed by this job: 2,361 (including thirty-five follow-ups to earlier batches)
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
| 2026-11-16 05:53 | 1     | 10    | 10 / 0 / 0                  | 15 / 5 (fixed, re-accepted) | none (batch 42) |
| 2026-11-16 05:58 | 1     | 10    | 10 / 0 / 0                  | 22 / 1 (fixed, re-accepted) | none (batch 43) |
| 2026-11-16 05:58 | 1     | 10    | 10 / 0 / 0                  | 18 / 0                   | none (batch 44) |
| 2026-11-16 06:01 | 1     | 10    | 10 / 0 / 0                  | 17 / 0                   | none (batch 45); `npm run test:all` passed via verifier after batch 44 (1,203 Jest, 819 Vitest) |
| 2026-11-16 06:07 | 1     | 10    | 10 / 0 / 0                  | 21 / 1 (fixed, re-accepted) | none (batch 46) |
| 2026-11-16 06:09 | 1     | 10    | 10 / 0 / 0                  | 23 / 2 (fixed, re-accepted) | none (batch 47) |
| 2026-11-16 06:10 | 1     | 10    | 9 / 0 / 1                   | 25 / 5 (4 fixed and re-accepted; 1 second rejection, old text kept) | none (batch 48) |
| 2026-11-16 06:20 | 1     | 10    | 10 / 0 / 0                  | 16 / 2 (fixed, re-accepted) | none (batch 49) |
| 2026-11-16 06:23 | 1     | 10    | 10 / 0 / 0                  | 23 / 2 (fixed, re-accepted) | none (batch 50) |
| 2026-11-16 06:24 | 1     | 10    | 10 / 0 / 0                  | 22 / 6 (fixed, re-accepted) | none (batch 51) |
| 2026-11-16 06:30 | 1     | 10    | 10 / 0 / 0                  | 20 / 3 (fixed, re-accepted) | none (batch 52); `npm run test:all` passed via verifier after batch 51 (1,203 Jest, 819 Vitest) |
| 2026-11-16 06:33 | 1     | 10    | 10 / 0 / 0                  | 23 / 1 (fixed, re-accepted) | none (batch 53) |
| 2026-11-16 06:35 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none (batch 54) |
| 2026-11-16 06:39 | 1     | 10    | 9 / 0 / 1                   | 24 / 9 (8 fixed and re-accepted; 1 second rejection, old text kept) | none (batch 55); 1 skip added |
| 2026-11-16 10:13 | 1     | 10    | 10 / 0 / 0                  | 36 / 4 (fixed, re-accepted) | none (batch 56) |
| 2026-11-16 10:15 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (fixed, re-accepted) | none (batch 57) |
| 2026-11-16 10:21 | 1     | 10    | 9 / 0 / 1                   | 30 / 2 (1 fixed and re-accepted; 1 plan reverted, needs-research) | none (batch 58); 1 skip added |
| 2026-11-16 10:25 | 1     | 10    | 10 / 0 / 0                  | 31 / 1 (fixed, re-accepted) | none (batch 59) |
| 2026-11-16 10:27 | 1     | 10    | 10 / 0 / 0                  | 22 / 0                   | none (batch 60); `npm run test:all` passed via verifier after batch 59 (1,203 Jest, 819 Vitest) |
| 2026-11-16 10:30 | 1     | 10    | 10 / 0 / 0                  | 21 / 0                   | none (batch 61) |
| 2026-11-16 10:32 | 1     | 10    | 10 / 0 / 0                  | 17 / 0                   | none (batch 62) |
| 2026-11-16 10:36 | 1     | 10    | 10 / 0 / 0                  | 16 / 3 (1 fixed and re-accepted; 2 dropped, old text kept) | none (batch 63) |
| 2026-11-16 10:38 | 1     | 10    | 10 / 0 / 0                  | 15 / 0                   | none (batch 64) |
| 2026-11-16 10:44 | 1     | 10    | 10 / 0 / 0                  | 18 / 3 (fixed, re-accepted) | none (batch 65); `npm run test:all` passed via verifier after batch 63 (1,203 Jest, 819 Vitest) |
| 2026-11-16 10:45 | 1     | 10    | 10 / 0 / 0                  | 16 / 0                   | none (batch 66) |
| 2026-11-16 10:49 | 1     | 10    | 8 / 0 / 2                   | 14 / 3 (3 plans reverted, needs-research) | none (batch 67); 3 skips added; spelling follow-up on 4 pages of batches 65-66 |
| 2026-11-16 10:52 | 1     | 10    | 9 / 0 / 1                   | 18 / 0                   | none (batch 68); `npm run test:all` passed via verifier after batch 67 (1,203 Jest, 819 Vitest) |
| 2026-11-16 11:17 | 1     | 10    | 10 / 0 / 0                  | 28 / 2 (fixed, re-accepted) | none (batch 69) |
| 2026-11-16 11:23 | 1     | 10    | 10 / 0 / 0                  | 23 / 4 (fixed, re-accepted) | none (batch 70) |
| 2026-11-16 11:29 | 1     | 10    | 10 / 0 / 0                  | 33 / 2 (fixed, re-accepted) | none (batch 71) |
| 2026-11-16 11:33 | 1     | 10    | 9 / 0 / 1                   | 31 / 4 (3 fixed and re-accepted; 1 plan rejected twice, old text kept) | none (batch 72); 1 skip added; `npm run test:all` passed via verifier after batch 71 (1,203 Jest, 819 Vitest) |
| 2026-11-16 11:38 | 1     | 10    | 10 / 0 / 0                  | 33 / 2 (fixed, re-accepted) | none (batch 73) |
| 2026-11-16 11:45 | 1     | 10    | 10 / 0 / 0                  | 33 / 1 (fixed, re-accepted) | none (batch 74) |
| 2026-11-16 11:50 | 1     | 10    | 10 / 0 / 0                  | 30 / 2 (fixed, re-accepted) | none (batch 75) |
| 2026-11-16 11:54 | 1     | 10    | 10 / 0 / 0                  | 33 / 2 (fixed, re-accepted) | none (batch 76); `npm run test:all` passed via verifier after batch 75 (1,203 Jest, 819 Vitest) |
| 2026-11-16 11:58 | 1     | 10    | 9 / 0 / 1                   | 25 / 5 (4 fixed and re-accepted; 1 plan rejected twice, old text kept) | none (batch 77) |
| 2026-11-22 19:16 | 1     | 10    | 10 / 0 / 0                  | 18 / 1 (fixed, re-accepted) | none (batch 2026-11-22-1) |
| 2026-11-22 19:22 | 1     | 10    | 10 / 0 / 0                  | 18 / 0 | none (batch 2026-11-22-2) |
| 2026-11-22 19:28 | 1     | 14    | 14 / 0 / 0                  | 30 / 3 (fixed; 1 re-accepted, 2 spelling) | none (batch 2026-11-22-3) |
| 2026-11-22 19:33 | 1     | 10    | 9 / 0 / 1                  | 18 / 2 (1 plan rejected twice, old text kept) | none (batch 2026-11-22-4); `npm run test:all` passed via the verifier after this batch (1,203 Jest, 819 Vitest) |
| 2026-11-22 19:39 | 1     | 10    | 10 / 0 / 0                  | 21 / 2 (fixed, re-accepted) | none (batch 2026-11-22-5) |
| 2026-11-22 19:43 | 1     | 10    | 10 / 0 / 0                  | 15 / 2 (fixed, re-accepted) | none (batch 2026-11-22-6) |
| 2026-11-22 19:47 | 1     | 10    | 10 / 0 / 0                  | 20 / 2 (fixed, re-accepted) | none (batch 2026-11-22-7) |
| 2026-11-22 19:52 | 1     | 10    | 10 / 0 / 0                  | 15 / 2 (fixed, re-accepted) | none (batch 2026-11-22-8); `npm run test:all` passed via the verifier after this batch (1,203 Jest, 819 Vitest) |
| 2026-11-22 19:57 | 1     | 10    | 10 / 0 / 0                  | 20 / 4 (fixed, re-accepted) | none (batch 2026-11-22-9) |
| 2026-11-22 20:03 | 1     | 10    | 9 / 0 / 1                  | 19 / 5 (4 fixed and re-accepted; 1 plan rejected twice, old text kept) | none (batch 2026-11-22-10) |
| 2026-11-22 20:21 | 1     | 10    | 10 / 0 / 0                  | 28 / 2 (fixed, re-accepted) | none (batch 2026-11-22-11) |
| 2026-11-22 20:23 | 1     | 10    | 10 / 0 / 0                  | 32 / 1 (fixed, re-accepted) | none; 1 skip added (batch 2026-11-22-12) |
| 2026-11-22 20:29 | 1     | 10    | 10 / 0 / 0                  | 26 / 1 (fixed, re-accepted) | none (batch 2026-11-22-13) |
| 2026-11-22 20:31 | 1     | 10    | 10 / 0 / 0                  | 31 / 2 (fixed, re-accepted) | none (batch 2026-11-22-14) |
| 2026-11-22 20:36 | 1     | 10    | 10 / 0 / 0                  | 33 / 1 (fixed, re-accepted) | none (batch 2026-11-22-15); `npm run test:all` passed via the verifier after batch 2026-11-22-14 (1,203 Jest, 819 Vitest) |
| 2026-11-22 20:38 | 1     | 10    | 10 / 0 / 0                  | 31 / 0 | none (batch 2026-11-22-16) |
| 2026-11-22 20:42 | 1     | 10    | 9 / 0 / 1                   | 30 / 4 (2 fixed and re-accepted; 1 plan rejected twice, old text kept) | none; 1 skip added (batch 2026-11-22-17) |
| 2026-11-22 20:44 | 1     | 10    | 10 / 0 / 0                  | 27 / 1 (fixed, re-accepted) | none (batch 2026-11-22-18) |
| 2026-11-22 20:48 | 1     | 10    | 9 / 0 / 1                   | 27 / 3 (1 fixed and re-accepted; 1 plan rejected twice, old text kept) | none (batch 2026-11-22-19) |
| 2026-11-22 20:49 | 1     | 10    | 10 / 0 / 0                  | 29 / 0 | none (batch 2026-11-22-20) |
| 2026-11-22 21:22 | 1     | 10    | 10 / 0 / 0                  | 34 / 1 (fixed, re-accepted) | none (batch 2026-11-22-21) |
| 2026-11-22 21:25 | 1     | 10    | 10 / 0 / 0                  | 29 / 1 (fixed, re-accepted) | none (batch 2026-11-22-22) |
| 2026-11-22 21:31 | 1     | 11    | 11 / 0 / 0                  | 23 / 4 (fixed, re-accepted) | none (batch 2026-11-22-23; includes a fix to a batch-22 page) |
| 2026-11-22 21:35 | 1     | 10    | 10 / 0 / 0                  | 36 / 2 (fixed, re-accepted) | none (batch 2026-11-22-24) |
| 2026-11-22 21:39 | 1     | 10    | 10 / 0 / 0                  | 35 / 3 (fixed, re-accepted) | none (batch 2026-11-22-25); `npm run test:all` passed via the verifier after batch 2026-11-22-24 (1,203 Jest, 819 Vitest) |
| 2026-11-22 21:44 | 1     | 10    | 10 / 0 / 0                  | 31 / 3 (fixed, re-accepted) | none (batch 2026-11-22-26) |
| 2026-11-22 21:49 | 1     | 10    | 10 / 0 / 0                  | 27 / 6 (fixed, re-accepted) | none (batch 2026-11-22-27) |
| 2026-11-22 21:54 | 1     | 10    | 10 / 0 / 0                  | 41 / 2 (fixed, re-accepted) | none (batch 2026-11-22-28) |
| 2026-11-22 21:56 | 1     | 10    | 10 / 0 / 0                  | 35 / 0 | none (batch 2026-11-22-29) |
| 2026-11-22 21:59 | 1     | 10    | 10 / 0 / 0                  | 34 / 0 | none (batch 2026-11-22-30); `npm run test:all` passed via the verifier after batch 2026-11-22-29 (1,203 Jest, 819 Vitest) |
| 2026-11-22 22:18 | 1     | 10    | 10 / 0 / 0                  | 28 / 3 (fixed, re-accepted) | none (batch 2026-11-22-31) |
| 2026-11-22 22:25 | 1     | 10    | 10 / 0 / 0                  | 29 / 1 (fixed, re-accepted) | none (batch 2026-11-22-32) |
| 2026-11-22 22:29 | 1     | 10    | 10 / 0 / 0                  | 25 / 0 | none (batch 2026-11-22-33) |
| 2026-11-22 22:34 | 1     | 10    | 9 / 0 / 1                  | 24 / 1 (1 restored, needs-research) | none (batch 2026-11-22-34); run stopped early at the owner's request after 4 batches, so the every-fourth-batch `npm run test:all` was not run this time |
| 2026-11-22 23:16 | 1     | 10    | 10 / 0 / 0                  | 35 / 3 (fixed, re-accepted) | none (batch 2026-11-22-35) |
| 2026-11-22 23:22 | 1     | 10    | 10 / 0 / 0                  | 39 / 2 (fixed, re-accepted) | none (batch 2026-11-22-36) |
| 2026-11-22 23:27 | 1     | 10    | 10 / 0 / 0                  | 32 / 0 | none (batch 2026-11-22-37) |
| 2026-11-22 23:33 | 1     | 10    | 10 / 0 / 0                  | 38 / 1 (fixed, re-accepted) | none (batch 2026-11-22-38); `npm run test:all` passed in the pre-push hook on every push this run (1,203 Jest, 819 Vitest) |
| 2026-11-22 23:39 | 1     | 10    | 10 / 0 / 0                  | 37 / 1 (fixed, re-accepted; 1 citation removed) | none (batch 2026-11-22-39); `npm run test:all` passed via the verifier after batch 2026-11-22-38 (1,203 Jest, 819 Vitest) |
| 2026-11-23 03:19 | 1     | 10    | 9 / 0 / 1                   | 37 / 7 (6 fixed, re-accepted; 1 restored, needs-research) | none (batch 2026-11-23-1) |
| 2026-11-23 03:24 | 1     | 10    | 10 / 0 / 0                  | 37 / 0 | none (batch 2026-11-23-2) |
| 2026-11-23 03:27 | 1     | 10    | 10 / 0 / 0                  | 31 / 1 (Motzko 10...Ne7 plan 2 held back on old text, resubmitted in batch 4) | none (batch 2026-11-23-3) |
| 2026-11-23 03:32 | 1     | 11    | 11 / 0 / 0                  | 36 / 2 (fixed, re-accepted) | none (batch 2026-11-23-4, includes a follow-up to a batch-3 page); `npm run test:all` passed via the verifier (1,203 Jest, 819 Vitest) |
| 2026-11-23 03:36 | 1     | 10    | 9 / 0 / 1                   | 36 / 3 (1 fixed, re-accepted; 1 restored, needs-research; 1 skip added) | none (batch 2026-11-23-5) |
| 2026-11-23 03:43 | 1     | 10    | 10 / 0 / 0                  | 32 / 2 (fixed, re-accepted) | none (batch 2026-11-23-6) |
| 2026-11-23 04:14 | 1     | 10    | 10 / 0 / 0                  | 29 / 0 | none (batch 2026-11-23-7) |
| 2026-11-23 04:19 | 1     | 10    | 10 / 0 / 0                  | 31 / 0 | none (batch 2026-11-23-8) |
| 2026-11-23 04:23 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (fixed, re-accepted) | none (batch 2026-11-23-9) |
| 2026-11-23 04:27 | 1     | 10    | 10 / 0 / 0                  | 29 / 0 | none (batch 2026-11-23-10); `npm run test:all` passed via the verifier after batch 2026-11-23-9 (1,203 Jest, 819 Vitest) |
| 2026-11-23 04:31 | 1     | 10    | 10 / 0 / 0                  | 16 / 3 (fixed, re-accepted) | none (batch 2026-11-23-11) |
| 2026-11-23 04:34 | 1     | 10    | 10 / 0 / 0                  | 18 / 0 | none (batch 2026-11-23-12) |
| 2026-11-23 04:38 | 1     | 10    | 10 / 0 / 0                  | 23 / 1 (fixed, re-accepted) | none (batch 2026-11-23-13) |
| 2026-11-23 04:43 | 1     | 10    | 8 / 0 / 2                  | 23 / 6 (2 fixed, re-accepted; 3 plans restored, needs-research) | none (batch 2026-11-23-14); 2 skips added; `npm run test:all` passed via the verifier after batch 2026-11-23-13 (1,203 Jest, 819 Vitest) |
| 2026-11-23 04:48 | 1     | 10    | 9 / 0 / 1                  | 18 / 7 (5 fixed, re-accepted; 1 plan restored, needs-research) | none (batch 2026-11-23-15); 1 skip added |
| 2026-11-23 04:52 | 1     | 10    | 9 / 0 / 1                  | 23 / 5 (3 fixed, re-accepted; 1 plan restored, needs-research) | none (batch 2026-11-23-16) |
| 2026-11-23 05:13 | 1     | 10    | 10 / 0 / 0                  | 25 / 2 (fixed, re-accepted) | none (batch 2026-11-23-17) |
| 2026-11-23 05:19 | 1     | 10    | 10 / 0 / 0                  | 20 / 1 (fixed, re-accepted) | none (batch 2026-11-23-18) |
| 2026-11-23 05:23 | 1     | 10    | 10 / 0 / 0                  | 28 / 1 (fixed, re-accepted) | none (batch 2026-11-23-19) |
| 2026-11-23 05:28 | 1     | 10    | 10 / 0 / 0                  | 20 / 1 (fixed, re-accepted) | none (batch 2026-11-23-20) |
| 2026-11-23 05:31 | 1     | 10    | 10 / 0 / 0                  | 18 / 3 (fixed, re-accepted) | none (batch 2026-11-23-21); `npm run test:all` passed via the verifier after batch 2026-11-23-20 (1,203 Jest, 819 Vitest) |
| 2026-11-23 05:35 | 1     | 10    | 10 / 0 / 0                  | 21 / 0 | none (batch 2026-11-23-22) |
| 2026-11-23 05:39 | 1     | 10    | 10 / 0 / 0                  | 21 / 0 | none (batch 2026-11-23-23) |
| 2026-11-23 05:42 | 1     | 10    | 10 / 0 / 0                  | 21 / 1 (fixed, re-accepted) | none (batch 2026-11-23-24) |
| 2026-11-23 08:30 | 1     | 10    | 10 / 0 / 0                  | 34 / 4 (fixed, re-accepted) | none (batch 2026-11-23-25) |
| 2026-11-23 08:19 | 1     | 10    | 10 / 0 / 0                  | 37 / 1 (fixed, re-accepted) | none (batch 2026-11-23-26) |
| 2026-11-23 08:23 | 1     | 10    | 10 / 0 / 0                  | 37 / 0 | none (batch 2026-11-23-27) |
| 2026-11-23 08:29 | 1     | 10    | 9 / 0 / 1                   | 40 / 2 (1 fixed and re-accepted, 1 reverted after a second rejection); 1 accepted plan revised and re-accepted | none; 1 skip added (batch 2026-11-23-28) |
| 2026-11-23 08:35 | 1     | 10    | 10 / 0 / 0                  | 32 / 2 (fixed, re-accepted) | none (batch 2026-11-23-29); `npm run test:all` passed via the verifier after batch 2026-11-23-28 (1,203 Jest, 819 Vitest) |
| 2026-11-23 08:41 | 1     | 10    | 10 / 0 / 0                  | 32 / 0 | none (batch 2026-11-23-30) |
| 2026-11-23 08:45 | 1     | 10    | 10 / 0 / 0                  | 38 / 1 (fixed, re-accepted) | none (batch 2026-11-23-31) |
| 2026-11-23 08:49 | 1     | 10    | 10 / 0 / 0                  | 28 / 1 (a spelling slip, fixed) | none (batch 2026-11-23-32) |
| 2026-11-23 08:53 | 1     | 10    | 10 / 0 / 0                  | 31 / 1 (fixed, re-accepted, with one more plan on that page) | none (batch 2026-11-23-33) |
| 2026-11-23 08:58 | 1     | 10    | 10 / 0 / 0                  | 37 / 2 (fixed, re-accepted) | none (batch 2026-11-23-34) |

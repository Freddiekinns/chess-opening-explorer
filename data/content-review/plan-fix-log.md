# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); 4,151 at the 02:10 UTC refresh; 4,108 on 3,215 pages at the 02:33 refresh (after batch 5); 4,035 on 3,155 pages at the 02:55 refresh (after batch 10); 3,976 on 3,105 pages at the 07:15 refresh (after batch 16); 3,928 on 3,065 pages at the 07:40 refresh (after batch 20); 3,834 on 2,985 pages at the 08:10 refresh (after batch 28); 3,750 on 2,915 pages at the 08:38 refresh (after batch 35); about 3,735 after batch 37
- Phase 1 pages left: about 2,890 skips excluded (viewed: 0)
- Pages reviewed by this job: 372 (including two follow-ups to earlier batches)
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

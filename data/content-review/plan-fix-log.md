# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); 4,151 at the 02:10 UTC refresh; 4,108 on 3,215 pages at the 02:33 refresh (after batch 5); about 4,086 after batch 7
- Phase 1 pages left: about 3,190, skips excluded (viewed: 0)
- Pages reviewed by this job: 70
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

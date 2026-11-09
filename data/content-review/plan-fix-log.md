# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); 4,151 at the 02:10 UTC refresh, about 4,124 after batch 3 (1 more added to skips)
- Phase 1 pages left: about 3,230, skips excluded (viewed: 0)
- Pages reviewed by this job: 30
- Phase: 1

## Batches

| UTC              | Phase | Pages | Fixed / ok / needs-research | Reviewer accept / reject | Parser changes |
| ---------------- | ----- | ----- | --------------------------- | ------------------------ | -------------- |
| 2026-11-09 01:40 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (fixed, re-accepted) | none        |
| 2026-11-09 02:12 | 1     | 10    | 10 / 0 / 0                  | 19 / 1 (fixed, re-accepted) | none        |
| 2026-11-09 02:30 | 1     | 10    | 10 / 0 / 0                  | 18 / 4 (fixed, re-accepted) | none; 1 skip added |

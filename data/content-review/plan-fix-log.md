# Plan fixes and page copy review: overnight log

Branch `overnight/233-plan-references`. Phase 1 (#233) fixes pages whose plan
references fail `plan-check.js`, viewed pages first, then by ECO code. Phase 2
(#208) reviews every other due page in the ledger. Every changed field passed an
independent reviewer before commit; notes per page are in
`data/content-review/batches/overnight-*.json`.

## Totals

- Failing references: 4,164 at the start of this job (2026-11-09 01:10 UTC run); latest known 4,164 minus this job's fixes (next plan-check refresh pending)
- Phase 1 pages left: 3,250 (viewed: 1)
- Pages reviewed by this job: 10
- Phase: 1

## Batches

| UTC              | Phase | Pages | Fixed / ok / needs-research | Reviewer accept / reject | Parser changes |
| ---------------- | ----- | ----- | --------------------------- | ------------------------ | -------------- |
| 2026-11-09 01:40 | 1     | 10    | 10 / 0 / 0                  | 24 / 1 (fixed, re-accepted) | none        |

# Active Context

**Date:** 2026-10-10

## Current Task: E2E specs green and in CI

Branch `test/e2e-green`, stacked on #171. All 9 Playwright specs failed on
`main` — the first eight on stale selectors and mocks, and locally on a missing
Chromium. Fixes, specs only (no app code changed): `mockApi.ts` answers
`/api/openings/browse` (honouring `level` and `family`) and serves studies in
schema v2 (`study_title`, `chapters_matched`, `match`), which had rendered an
empty title. Selectors follow today's copy: "Paste a game", "Surprise me" on the
landing page, the hero search rows (buttons), the Difficulty/Family menus
(Family is a dialog of buttons, not a listbox), "Analyse your games" and the
"Username" textbox. Mobile detail folds learning resources into "Videos (n)" /
"Studies (n)" buttons, so the overflow spec waits on those.

`webServer` now starts only `dev:web` — every `/api` call is mocked. CI job
**Test E2E** installs Chromium and uploads the report on failure. 27 of 27 with
`--repeat-each=3` under `CI=1`.

## Previous Task: Brief-audited description fixes (#171)

All 43 claims the style briefs marked wrong, in 32 pages, plus a mislabelled Ruy
Lopez one, fixed in `api/data/eco/`. Merging is the owner's: auto mode refuses
`gh pr merge`. Full text: `archive.md`.

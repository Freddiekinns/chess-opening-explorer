# Active Context

**Date:** 2026-09-24

## Current Task: Behavioural analytics on PostHog

**Measurement (backlog decision 5) is decided: page views on Vercel, events on
PostHog.** Vercel Web Analytics was never off — the dashboard shows visitors,
routes, referrers and devices. The API's "Web Analytics not found", which the
feature review repeated, is wrong. Custom events are Pro-only on Vercel, and the
`/api/event` beacons went to runtime logs that Hobby keeps for one hour.

`trackEvent` in `packages/web/src/lib/analytics.ts` now sends to PostHog EU
Cloud (free tier, project 283180). It loads `posthog-js/dist/module.slim` lazily
(49 KB gz) and **only when the hostname is `openingbook.xyz`**, so dev, tests
and previews send nothing. It is cookieless (localStorage), bootstrapped with
our existing anonymous id, with autocapture and session replay off. `App`
reports `$pageview` on each route change (#146 — the slim build has no history
autocapture, so #145 shipped with none). The project token is public by design
and lives in the source. `/api/event` and its test are deleted.

Events: `analyse_run`, `band_select`, `explorer_error` (existing) plus
`search_select {surface, rank}`, `practice_start`, `video_click {via}`,
`pgn_lookup {found}`, `repertoire_toggle {action}`.

No `/ingest` reverse proxy: the middleware matcher would catch it and invoke
middleware per event. Ad blockers therefore drop some events.

Verified on production 2026-09-24; PostHog took up to ~5 minutes to show events.
Saved insights: landing page → search → practice, search → practice, weekly
`analyse_run` retention (the accounts gate), weekly users per action. Test
traffic is excluded by the project's test-user filter (`Device ID ≠` the two
test browsers' anonymous ids), on for all insights. Next: read them once a week
or two of real traffic exists.

## Previous Task: Feature review and backlog rev 4

Every feature idea since February re-checked against `main`. Slice 2 of the
deviation trainer was never started and the August audit's P0s are still open.
`docs/backlog.md` rev 4 sequences credibility → loop → trainer → platform.
Review: `docs/reviews/2026-09-24-feature-review.md`. Detail in `archive.md`.

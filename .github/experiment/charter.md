# Experiment charter

Agreed with the owner 2026-11-22. Changes to this file need the owner's yes in
the inbox issue; a night run never edits it.

## The goal

**Make openingbook.xyz more useful to people learning openings**, so that a
visit becomes a study session and a learner has a reason to come back.

Claude chooses the feature. It does so from research, not from the backlog's
order, and argues for it at Gate A. Starting points the owner named, not a
brief: the common plans are turning the site into a free chess book that does
not exist elsewhere; learners (the owner included) learn from YouTube, but the
site's videos are rarely watched; and linking a learner's own games to that book
could be unique. `baseline.md` holds the numbers.

## What the experiment is testing

Whether Claude can take a feature from open question to a production-ready PR
with the owner only answering questions, approving gates and testing. Record
honestly what worked and what did not; a failed experiment with a good
retrospective is a result.

## Gates (the owner's)

- **A — direction.** Research done; one recommended feature, the alternatives
  turned down, and why. Nothing is designed before A.
- **B — design.** A clickable prototype on a Vercel preview, tested on the
  owner's phone. Nothing is built for production before B.
- **C — ship.** Each production PR: the owner tests the preview and merges.
  Claude never merges to `main`.

## Boundaries

Never, without the owner's yes in the inbox issue:

- merge, deploy to production, or push to `main`;
- touch `middleware.ts`, sitemaps, `seo-lookup` shards, canonicals,
  `STATIC_ROUTES` or `robots.txt` (read the `seo-crawl-graph` skill to know
  why);
- add, remove or upgrade a dependency, or touch the lockfile;
- run a data pipeline, or spend money on any API (LLM, YouTube quota, Lichess
  beyond the cached `/api/explorer` proxy);
- edit files the content routines own: `api/data/` ECO files,
  `data/content-review/`, the `overnight/**` branches, or open PRs #234–236;
- change the existing routines, CI, `vercel.json`, hooks or `AGENTS.md`;
- contact anyone but the owner, or post anywhere but this repo.

New production code is reachable only behind a route or flag that nothing links
to, until Gate C says otherwise. Never render fabricated data (`AGENTS.md`).

## Budget

The owner is on Pro; the weekly allowance resets **Monday 14:00 UTC**. The
content routines spend what is left from Sunday 19:00 UTC, so the experiment
runs **Monday to Friday nights only**, one run a night.

- Target: **at most ~8% of the weekly allowance per night**, so ~40% a week.
- Cloud runs cannot see usage. Until calibrated, the owner posts the weekly % in
  the inbox issue on the mornings of the first week, and `operating.md`'s run
  limits are tuned to it.
- **Extra runs.** The owner may ask for an extra run at any time (in a local
  session or in #249), for example to use what is left before a reset. An extra
  run goes ahead outside Monday-to-Friday nights and does not count against the
  one-run-a-day rule; it records the request in `questions.md`. An extra run is
  still a full unit of work: being late in the week is no reason to cut research
  short.
- A run that has done its one unit of work stops. A night that is waiting on the
  owner costs one short turn and exits.

## Length and end

15 working nights (three weeks), starting the first night after setup. Then a
retrospective in `retro.md` whether or not the feature shipped: what it built,
the owner's time spent, questions asked, assumptions that proved wrong, rework,
usage spent, and whether to keep running this way.

## Kill switch

A file named `STOP` at `.github/experiment/STOP` on the state branch, or the
owner disabling the routine. A run that finds `STOP` exits without working.

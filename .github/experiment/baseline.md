# Baseline — 2026-11-22

Read by hand on 2026-11-22 from PostHog (Chrome session), Vercel Web Analytics
and Search Console. Cloud runs cannot reach any of these; this file is what they
know. Earlier baseline (2026-10-11 / 10-24) is in the owner's auto-memory and
summarised under **Then**.

## Traffic

| Source              | Window           | Number                                           |
| ------------------- | ---------------- | ------------------------------------------------ |
| Vercel              | 30d to 11-22     | 276 visitors (+104%), 535 views, 76% bounce      |
| PostHog people/week | w/c 10-12 → 11-16 | 26, 25, 29, 36, **76**, 49                     |
| PostHog returning   | since 09-24      | 13 of 296 people seen on more than one day (4%)  |
| Search Console      | 28d to 11-20     | 62 clicks, 1.88k impressions, CTR 3.3%, pos 8    |

The jump in w/c 11-09 is real in both tools but **unexplained**. It is mostly
US (67 of ~110 people since 11-10), direct, landing on `/`. Do not credit any
feature with it until it is understood; it may be a bot or a single link.

Search is flat against October (~14 clicks/week then, ~15 now). Google brings
people to obscure named lines; the top queries are the brand and "opening book".

## Behaviour (PostHog, 10-24 → 11-22, test devices excluded)

- Sessions: 181 single-page, 30 with 2–4 pages, 13 with 5+. Median session
  length 0 s, 80th percentile 32 s. **Most visits are one glance.**
- Pageviews: opening pages 201 (117 people), home 126 (80), `/analyse` 24 (15),
  `/repertoire` 7 (5). `/assets/` 11 — probably a broken link or bot, unchecked.
- Events (count, people): band_select 40/10, video_gallery_view 33/20,
  opening_nav 25/8, practice_start 20/13, search_start 10/7, search_select 8/6,
  **video_click 8/7**, practice_complete 8/5, repertoire_toggle 2/1,
  pgn_lookup 1/1.

## What changed since October

- `video_click` went from 1 ever to 8 by 7 people, 6 of them after the
  2026-11-11 video rematch. Of 20 people who saw a gallery, 7 clicked. Small
  numbers, but "nobody clicks videos" is no longer true; "nobody scrolls far
  enough to see them" may be closer.
- Practice: 13 people started, 5 finished.
- Retention has not moved: ~4% come back.

## What this means for the experiment

1. At ~30–50 real people a week, no feature can be judged by analytics inside
   three weeks. Judge by the owner and named testers; use analytics only as a
   sanity check.
2. The problem is not a missing feature on the page. It is that a visit is one
   glance and nobody returns. Anything worth building gives a learner a reason
   to stay for a session and to come back.

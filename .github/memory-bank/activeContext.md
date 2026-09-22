# Active Context

**Date:** 2026-09-22

## Current Task: SEO check-up, Vercel usage, and the Dependabot queue

**Search Console: indexing recovered, serving has not.** 7,174 indexed (was
5,750), "Discovered – not indexed" 3,615 → 2,038, average position 40–60 in
August → 10–20 in September. Impressions are still 3–40/day against 100–250 in
mid-July: Google indexes the pages and declines to show them. Sitemaps 5–7 (the
least-played openings) have never been read; they serve fine.

**81 soft 404s were our own error copy.** `loadPage` rendered "Opening not
found" for any failed fetch, painted over the pre-rendered `#root`. Live-tested
pages rendered fully. #142: only an API 404 says not found; a failed load says
"This opening didn't load" with a retry. Run "Validate fix" in Search Console.

**Vercel: not more traffic, costlier requests.** Edge requests flat at 28–36k a
week; Active CPU per invocation ~3× since mid-August — crawlers hit distinct
FENs sparsely, half land cold, and each `/api/openings` cold start parses ~78 MB
of JSON (3.1s cold vs 0.3s warm). 1h55m of Hobby's 4h. Parked: lazy-load
`video-index.json` if it climbs. The Aug 30–31 pass cut ~100 deployments and
took Functions Storage to 7.98/10 GB — #141 stops `dependabot/**` deploying.

**Page weight was the site icon.** `opening-book-icon.png` was a 919×794, 568 KB
favicon — two-thirds of every first page load. Now 512 px, 46 KB (#143); the
full-resolution master stays in `design-system/project/assets/`. Mobile
Lighthouse LCP swung 2.3–5.1s with it; JS is ~135 KB gz and fine.

**Dependabot:** #140, #138 merged (test counts matched `main`); #133 needed its
bot-triggered CI approved. **vitest 5 is blocked upstream**: combined with
coverage-v8 5 it installs and tests clean but fails type-check — jest-dom 7.0.1
augments `Assertion<T>`, vitest 5 declares `Assertion<T, E>`. #136's green was
false (vitest 4 still nested). TS 7 (#107) still waits on typescript-eslint.

## Previous Task: The Dependabot backlog, fifth pass

Everything bar typescript 7: jest 30, the vite 8 / vitest 4 cluster as one
branch, supertest 7, jest-dom 7, speed-insights 2, jsdom 30; CI off Node 20.
`codeSplitting.groups` fixed a vendor split vite 5 had made inoperative. Three
filter triggers' accessible names depended on CSS. Detail in `archive.md`.

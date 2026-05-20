# Active Context

**Date:** 2026-05-20

## Current Task: Fix GSC "Couldn't fetch" sitemap error

**Status:** PR #32 open. Root cause: the 2026-03-29 SEO refactor broadened the
`middleware.ts` matcher but dropped `sitemap.xml`/`robots.txt` from its
exclusions, so the crawler hit the Edge `return fetch(request)` round-trip
instead of the static file — GSC showed "Couldn't fetch / Type: Unknown" since
the 30 Apr submission. Fix re-adds both files to the matcher's negative
lookahead. Prior fixes failed because they targeted the www→apex redirect, not
the sitemap path. Final confirmation needs deploy + re-submit in GSC.

## Previous Task: Opening Detail Layout — Sticky Board + FEN Polish

Two-column layout switched from `align-items: stretch` to `start` with sticky
left column (board). Navigator nested scroll removed. FEN font monospace → DM
Sans at 13px (16px mobile). Build clean.

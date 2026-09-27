# Active Context

**Date:** 2026-09-27

## Current Task: Logo refresh

The raster pawn-on-a-book illustration (512×442 PNG, a smudge below 32px) is
replaced by a flat SVG of the same idea: an orange Staunton pawn seated in an
open book, its base a shallow arc following the curved pages. Chosen by the
owner over a "ribbon pawn" (read as a person, and a lone pawn is chess.com's
mark) and a board-as-book concept. Explorations:
`design-system/project/ explorations/logo-refresh/`.

Icons live in `packages/web/public/brand/` plus `favicon.ico`; `icon-512.png` is
`og:image`. The middleware matcher excludes `brand/` and `favicon.ico` so icon
requests never invoke the edge function. The SVG favicon darkens its pages under
a light colour scheme; the ICO cannot adapt, so it uses mid-grey. The TopBar
draws the mark inline. `opening-book-icon.png` stays only for cached social
previews. Rules: `design-system/project/README.md` → Logo.

## Previous Task: Behavioural analytics on PostHog

`trackEvent` sends to PostHog EU (lazy slim SDK, `openingbook.xyz` only,
cookieless); `App` reports `$pageview` itself. Page views stay on Vercel.
Verified on production 2026-09-24; next, read the saved insights once real
traffic exists. Detail in `archive.md`.

# [TASK009] - SEO: Get Opening Pages Indexed by Google

**Status:** Done **Added:** 2026-02-28 **Updated:** 2026-02-28 **Author:** Fred
Wildi (via Claude planning session)

---

## The Problem

The site is verified in Google Search Console and has a sitemap listing all
12,377 opening URLs. Despite this, **only one page is indexed: the home page**.
The `/analyse` page and all 12,377 `/opening/<fen>` pages are completely
invisible to Google.

### Root Cause

The site is a Vite React SPA. Vercel serves the same `index.html` for every URL:

```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

When Google's crawler fetches any URL — whether `/analyse` or
`/opening/rnbqkbnr%2F...` — it receives the exact same HTML:

```html
<title>Opening Book - Discover, explore and learn chess openings</title>
<meta
  name="description"
  content="Learn and practice chess openings with our comprehensive training tool"
/>
<div id="root"><!-- empty until JavaScript runs --></div>
```

**Google fetches raw HTML before executing JavaScript.** It sees 12,377+ pages
with identical titles, descriptions, and empty bodies. It concludes they are
duplicates and declines to index them. The home page survived only because it's
the canonical root URL with the most authority.

### Current SEO Audit

| Aspect                   | Current State                                             |
| ------------------------ | --------------------------------------------------------- |
| `<title>`                | Static, same on every page ❌                             |
| `<meta description>`     | Static, same on every page ❌                             |
| Open Graph tags          | None ❌                                                   |
| Twitter Card tags        | None ❌                                                   |
| Canonical URL            | None ❌                                                   |
| JSON-LD structured data  | None ❌                                                   |
| Dynamic title via JS     | None — no `react-helmet`, no `document.title` anywhere ❌ |
| `robots.txt`             | ✅ Present in `packages/web/public/`                      |
| `sitemap.xml`            | ✅ Present, 12,377 URLs                                   |
| Google Site Verification | ✅ In `index.html`                                        |

### Secondary Issues (also need fixing)

- **No Open Graph tags** — sharing any page on Twitter/LinkedIn shows no preview
- **No structured data (JSON-LD)** — Google doesn't understand that pages are
  about chess openings
- **Sitemap is already correct** (12,377 URLs) — this is NOT the problem

---

## Options Considered

### Option A — react-helmet-async only _(simplest, lower confidence)_

Add the `react-helmet-async` library to set a unique `<title>` and
`<meta description>` inside each React component at runtime.

**How it works:** When Googlebot loads `/opening/<fen>`, the React app boots and
updates the `<title>` to e.g. `"Sicilian Defence (B20) — Opening Book"`.

**Why it's not enough on its own:** Googlebot processes pages in two waves:

1. HTML fetch (immediate) — still sees generic title/description
2. JavaScript render (later, slower) — finally sees the dynamic title

For a site with 12,377 pages, relying entirely on Googlebot's JS rendering for
all of them is slow and unreliable. Indexing could take many months, if it
happens at all at scale.

**Effort:** 1–2 days · **Confidence:** Medium

---

### Option B — Vercel Edge Middleware + react-helmet-async _(recommended)_

Add a `middleware.ts` file at the project root. Vercel runs this at the edge
layer before serving any HTML.

**How it works:**

1. At build time, generate a lightweight JSON lookup:
   `{ "<encoded-fen>": { "name": "Sicilian Defence", "eco": "B20" } }` from the
   existing ECO data files
2. The middleware reads the incoming URL
3. If it matches `/opening/<fen>`, look up the opening name and inject the
   correct `<title>` and `<meta description>` into the HTML before it's sent
4. **Google's very first raw HTML fetch sees a unique, meaningful title for
   every opening page** — no JavaScript needed

Example: A request to
`/opening/rnbqkbnr%2Fpp1ppppp%2F8%2F2p5%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR`
returns:

```html
<title>Sicilian Defence (B20) — Opening Book</title>
<meta
  name="description"
  content="Explore the Sicilian Defence (B20). Played after 1. e4 c5. Win rates, top videos, and training resources."
/>
```

**No architectural rewrite required.** Stays on Vite/React. Vercel-native.

**Effort:** 3–5 days · **Confidence:** High

---

### Option C — Prerender top N pages at build time _(partial)_

Use `vite-plugin-prerender` to statically generate full HTML for the top 200–500
most popular openings during the build step.

**Why it's limited:** With 12,377 openings, prerendering everything at build
time would take too long and produce an enormous deployment. Only helps for the
openings you select upfront.

**Effort:** 3–4 days · **Confidence:** Medium (only for selected pages)

---

### Option D — Full Static Site Generation (SSG) _(investigated, rejected for now)_

Convert the site to full SSG using `vite-ssg`, Vike, or a framework like
Astro/Next.js, pre-rendering all ~12,650 opening pages as static HTML at build
time.

**Why this is the "textbook" best-practice answer:** The data is 100% static
JSON, available at build time, and the SEO-critical content (opening name,
description, moves, stats) is text-heavy. SSG would deliver complete HTML on
first fetch — perfect LCP, perfect for Googlebot, no JS dependency at all.

**Why it's not viable right now — SSG Feasibility Assessment:**

| Blocker                                          | Severity  | Detail                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`react-chessboard` cannot render server-side** | 🔴 High   | Built on `@dnd-kit`, uses `ResizeObserver`, DOM events, browser measurement APIs. Called during render, not guarded behind `useEffect`. Central to every opening page. Would need lazy-import wrappers with `typeof window` guards on every usage.                                                  |
| **~12,650 pages × ~200ms = ~42-minute build**    | 🔴 High   | Each page requires 5 data fetches (opening, stats, videos, studies, related). Near or above Vercel's free-tier build timeout (45 min). Even with parallelization, risky.                                                                                                                            |
| **`localStorage` in `useChessboardState`**       | 🟡 Medium | Called inside state initializer (runs during render, not inside `useEffect`). Would crash SSG. Needs `typeof window` guard.                                                                                                                                                                         |
| **No SSG infrastructure exists**                 | 🟡 Medium | No server entry point, no `StaticRouter`, no Vike/vite-ssg. Would need to build SSG pipeline from scratch, including a separate server entry point for `main.tsx`.                                                                                                                                  |
| **Data fetching architecture change**            | 🟡 Medium | Current pattern is `useEffect` → `fetch(/api/...)` → Vercel serverless → JSON files on disk. SSG would need a build-time data resolver that reads JSON directly, replacing 5 parallel API calls per page. The `eco-service.js` is CommonJS, not directly importable in Vite ESM without adaptation. |
| **`BrowserRouter` → `StaticRouter` split**       | 🟡 Medium | Standard but requires separate client/server entry points.                                                                                                                                                                                                                                          |

**What IS SSR-safe already (positives):**

- ✅ Most browser API usage is properly inside `useEffect` or event handlers
- ✅ `SearchOverlay` already has a `typeof window !== 'undefined'` guard
- ✅ `chess.js` is pure JS — all game logic works server-side
- ✅ `lucide-react` icons are pure SVG — no browser dependency
- ✅ `@vercel/analytics` and `@vercel/speed-insights` are SSR-aware

**Estimated effort:** 2–3 weeks with meaningful risk of broken deploys.

**Verdict:** SSG is the architecturally ideal long-term solution, but the
migration cost is too high to justify as the first step. The middleware approach
solves the _specific indexing problem_ (duplicate meta tags) in days rather than
weeks.

---

### Option D Revisited — Future SSG Path (if needed)

If indexing remains poor 4–6 weeks after deploying Option B, consider a **hybrid
approach**:

1. **Pre-render top ~200 most popular openings** at build time (fast build,
   avoids the `react-chessboard` problem by rendering a simplified HTML shell)
2. **Keep the middleware for the remaining ~12,400 long-tail openings**
3. **Or migrate to Astro with React islands** — Astro's island architecture is
   purpose-built for static content with interactive widgets, and would handle
   the chessboard cleanly as a client-only island

This avoids the all-or-nothing risk of a full SSG migration while capturing most
of the SEO benefit for the highest-value pages.

---

## Recommended Approach: Option B

### Why Middleware Is Sufficient for the Indexing Problem

The specific problem is: Google sees 12,650 identical pages and treats them as
duplicates. The middleware fixes exactly this — unique `<title>` and
`<meta description>` in the raw HTML.

Google **does** render JavaScript (it uses headless Chromium). Many large React
SPAs are indexed (Airbnb, Netflix browse pages). The key requirement is unique
meta tags per page so Google doesn't deduplicate before it even attempts JS
rendering. The middleware provides this.

Core Web Vitals (LCP, FCP) are a separate ranking signal from indexing. The site
needs to be _indexed_ before page speed matters for ranking. Solve one problem
at a time.

### What We Build

#### 1. Build-time FEN lookup generator

- **New file:** `scripts/generate-seo-lookup.js`
- Reads from existing ECO data files in `packages/api/src/data/eco/` (5 files:
  `ecoA.json` through `ecoE.json`)
- Each ECO file is keyed by FEN, with `name`, `eco`, `moves` fields per entry
- Outputs: `packages/web/public/seo-lookup.json` — a compact map of encoded FEN
  → `{ name, eco, moves }`
- **Must stay under ~500KB** for edge middleware performance (Vercel edge
  middleware bundle limit is 1MB). Strip all fields except `name`, `eco`, and
  `moves`.
- Hooked into `build:vercel` in `package.json` so it runs on every Vercel deploy

#### 2. Vercel Edge Middleware

- **New file:** `middleware.ts` (project root) — no middleware currently exists
- Intercepts `/opening/*` requests, extracts FEN from URL, looks up opening name
- Also sets a fixed unique title/description for `/analyse`
- Injects `<title>` and `<meta name="description">` into the HTML response
- Passes all other routes (including `/api/*`) through unchanged
- **FEN encoding caveat:** FENs contain `/`, spaces, and special chars that are
  URL-encoded. The middleware must `decodeURIComponent` carefully and match
  against lookup keys exactly as stored in the ECO data.

#### 3. react-helmet-async in React components

- **New dependency** — not currently installed
- Wrap app in `<HelmetProvider>` in `App.tsx`
- Handles client-side meta updates: Open Graph, Twitter cards, canonical URLs
- Works alongside the middleware — middleware handles first-fetch meta, Helmet
  manages ongoing client navigation
- Added to: `OpeningDetailPage.tsx`, `LandingPage.tsx`, `AnalyseGamesPage.tsx`
- Currently **zero** dynamic title/meta logic exists anywhere in the app

#### 4. JSON-LD structured data

- Added to `OpeningDetailPage.tsx`
- Use `Article` or `WebPage` schema with opening name, ECO code, and description
- Helps Google understand content type, may surface rich results

#### 5. Update `index.html` baseline tags

- Add Open Graph base tags (`og:site_name`, `og:type`)
- Add `<link rel="canonical">`
- Improve default `<meta description>`
- Keep existing Google Site Verification tag

#### 6. Resubmit sitemap in Search Console

- After deploying, use Search Console to request indexing for ~10 high-value
  opening pages
- Sitemap already correct — no changes needed to it

---

## Files to Create / Modify

| Action  | File                                           | Notes                                            |
| ------- | ---------------------------------------------- | ------------------------------------------------ |
| Create  | `scripts/generate-seo-lookup.js`               | Build-time FEN→name lookup generator             |
| Create  | `middleware.ts`                                | Vercel edge middleware for meta injection        |
| Modify  | `package.json`                                 | Add generate-seo-lookup to `build:vercel` script |
| Modify  | `packages/web/src/App.tsx`                     | Wrap in `<HelmetProvider>`                       |
| Modify  | `packages/web/src/pages/OpeningDetailPage.tsx` | Add Helmet + JSON-LD                             |
| Modify  | `packages/web/src/pages/LandingPage.tsx`       | Add Helmet tags                                  |
| Modify  | `packages/web/src/pages/AnalyseGamesPage.tsx`  | Add Helmet tags                                  |
| Modify  | `packages/web/index.html`                      | Add OG base tags + improve default meta          |
| Install | `react-helmet-async`                           | Client-side head management                      |

---

## Verification

1. Run `node scripts/generate-seo-lookup.js` — confirm `seo-lookup.json`
   generated with correct opening names and is under 500KB
2. Run `npm run build` — confirm build succeeds with no TypeScript errors
3. Deploy to Vercel preview branch
4. `curl -s https://<preview-url>/opening/<fen> | grep "<title>"` — must show
   opening-specific title (not the generic one)
5. Test with Google's
   [Rich Results Test](https://search.google.com/test/rich-results) on an
   opening URL
6. Use Search Console "URL Inspection" to request indexing of a sample page
7. Check Lighthouse SEO score on an opening detail page (target: 90+)

---

## Expected Outcome

- Google sees unique, meaningful HTML on its first fetch — no JS required
- 12,377 pages each have a distinct title and description
- Social sharing (Twitter, LinkedIn, Discord) shows proper previews with Open
  Graph tags
- Structured data helps Google understand content type
- Estimated time to see indexing improvement: 2–6 weeks after deploy (normal
  crawl cycle)

## Follow-Up (4–6 Weeks Post-Deploy)

- **Monitor Search Console** — track indexed page count over time
- **If indexing is progressing well:** No further action needed. Middleware +
  Helmet is the long-term solution.
- **If indexing remains poor:** Investigate hybrid SSG for top ~200 openings
  (see Option D Revisited above)
- **Separate concern:** Core Web Vitals optimization (LCP, FCP) is a distinct
  task, not part of this indexing fix

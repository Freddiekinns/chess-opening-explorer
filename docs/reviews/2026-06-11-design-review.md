# Design Review — Home, Analyse, Opening Pages (2026-06-11)

Full front-end design review of the three core surfaces, conducted live against
the dev build (desktop 1440px + mobile 375px), with code-level tracing of every
finding. Overall verdict: **the visual layer is genuinely strong** — the Warm
Editorial Dark brand is distinctive and coherent, the token system is
disciplined, and mobile is properly re-designed rather than squashed. The gap to
"high quality" is not aesthetics; it is trust-undermining details in a data
product.

## Fixed in this PR

| #   | Finding                                                                                                                                                             | Fix                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `OpeningCard` fabricated W/D/L stats with `Math.random()` when real data was missing — fake numbers visually identical to real Lichess stats, changing every render | `getGameStats()` returns `null`; both card variants omit the bar entirely                                                                                                                                                                  |
| 2   | Open search dropdown was painted over and click-blocked by "My repertoire" (worse on mobile)                                                                        | `sectionReveal` used `animation-fill-mode: both` while animating `transform`, leaving a permanent stacking context on every landing section. All usages switched to `backwards` (visually identical); guard comment added at the keyframes |
| 3   | Search results indistinguishable — B90/B94/B95 Najdorfs all displayed `1. e4 c5 2. Nf3 d6`                                                                          | `formatMovesPreview` now shows the full line up to 60 chars; longer lines keep the tail (the distinguishing moves), cut at a move-number boundary                                                                                          |

## Remaining findings and recommendations

### Recommend fixing — high value

1. **Content-pipeline artifacts on detail pages** (🟡 moderate, the biggest
   remaining trust issue). Three symptoms, one root cause (LLM enrichment /
   matching without validation):
   - King's Pawn Game's "Common plans" describes a different opening ("primitive
     attack on f7 with Ne2–g3 and Qh5" / "punish White's poor opening").
   - A Semi-Slav study appears under King's Pawn Game's learning resources.
   - Study titles duplicate themselves: "The Ponziani Guide: … – The Ponziani
     Guide: …" (`course_title` already contains a "name – name: chapter"
     concatenation, plus emoji noise).

   _Recommendation:_ separate data-quality task. The title dedupe is a cheap
   render-time fix in `StudiesGallery`; the plans/studies mismatches need
   spot-validation in the enrichment pipeline (e.g. check the text/study anchors
   against the page's ECO family, hide on mismatch).

2. **Card semantics and keyboard access** (🟡 moderate, small mechanical fix).
   `OpeningCard` is a `div role="button"` that only activates on Enter (not
   Space), and each `MiniBoard` injects hundreds of unnamed SVG nodes into the
   accessibility tree. _Recommendation:_ make cards real `<a>` elements (they
   navigate — also enables middle-click and crawlable internal links),
   `aria-hidden` the board SVGs, and promote detail-page section headings from
   H3 to H2 (currently H1 → H3 skip). Cheap, real a11y + SEO benefit.

3. **Analyse hero-card disambiguation** (🟡 moderate, small UI change).
   "Top-performing: Vienna Gambit: 3…d6" (100% win) and "Needs work: Vienna
   Game: Vienna Gambit" (100% loss) read as the same opening with the same
   displayed move prefix, both 4 games. _Recommendation:_ show each card's full
   distinguishing line, and make the inline-expanded family rows use one label
   convention (variation name where known, move suffix as secondary text; label
   the bare-family child "Main line" instead of repeating the family name).

### Recommend fixing — when convenient

4. **Broken audio** (🟢 minor). `move`/`success` sounds fail with
   `EncodingError: Unable to decode audio data` on every board interaction —
   practice feedback is silently dead and the console is noisy.
   _Recommendation:_ re-encode the assets, or delete the sound code if sounds
   are not valued. Either is fine; the current half-broken state is the worst
   option.

5. **Copy nits** (🟢 minor, fix on next touch): "Tap the star…" shows on desktop
   (touch-centric verb); "+1 uncategorised opening · 1 games · 100%" needs
   pluralisation.

6. **Mobile filter chips** (🟢 minor). Level + ECO-family chips stack into ~7
   rows on 375px, pushing the first card below the fold. _Recommendation:_
   horizontally scrollable chip rows. Nice-to-have.

### Accept for now — documented decision

7. **Practice mode on one-move openings** shows "Move 1 of 1" and
   under-delivers. Extending practice into mainline continuations is new
   functionality (out of scope); hiding the CTA on one-move lines removes a
   consistent affordance for marginal gain. Revisit with any future
   practice-mode work.

8. **Orange accent on elevated surfaces** measures 4.09:1 — fine for the
   large/bold uses observed, below AA for small body text. No current violation.
   _Action taken:_ documented here; avoid small orange text on
   `--surface-elevated`. Everything else measured passes AA comfortably (primary
   14.5:1, secondary 5.95:1, orange-on-base 5.06:1).

9. **Minimal footer** ("© 2026 · MIT License"). Linking ECO family hubs and
   Analyse from the footer would help discoverability and internal linking for
   the ~12k indexed pages, but it deserves a deliberate IA/SEO pass, not a
   drive-by. Bundle with the next SEO task.

10. **Same-name duplicate search entries** (two B90 rows). Largely mitigated by
    fix #3 (lines are now distinguishable); a FEN-level dedupe in the
    suggestions list is possible but low value now.

## What works well (keep doing this)

- Token discipline in `simplified.css`; Bricolage Grotesque + DM Sans pairing.
- Detail-page information architecture: stats → overview → breadcrumbed
  opening-book trail → continuations → alternatives → plans → resources is the
  right reading order for a learner.
- Mobile-specific patterns: bottom tab bar, As White/As Black segmented control,
  stacked stat cards. The mobile Analyse page is the best screen in the app.
- Designed empty states (repertoire star prompt, analyse idle state); state
  survives back-navigation.

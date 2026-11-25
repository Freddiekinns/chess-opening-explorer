# Spike 03: "Common mistake at your level" panel

Throwaway. Hard-coded data for two FENs (note: the brief's Knight Attack FEN
omitted the e5 pawn; the real page FEN is `...2n2n2/4p1N1/2B1P3/...`). Stafford
"6.d3?" score is approximated as 100-85=15% (draws ignored): not a real number.

## What was built

`MistakePanel` (surface card, orange left rule, kicker, 3 lines, "Try it"
button, button does nothing), rendered on the mobile layout of
`OpeningDetailPage` directly above `MobileDataSurface` (the Opening explorer
card). Desktop untouched. Screens: `two-*.png`, `stafford-*.png` (`-full` = full
page, `-viewport` = 390x844 with panel centred).

## Where it lands at 390 px

Top of panel is y=856 (Two Knights) / 844 (Stafford): exactly 1.0 screens down,
i.e. the first thing after the Overview paragraph, immediately above Opening
explorer. Page height is ~2,600 px, so it is the top of screen 2. Board + move
row + overview fill screen 1; the panel is not visible without scrolling.

## Reads well

- Colour-coded mistake (brick) vs better move (sage) scans in one glance; tokens
  fit the Warm Editorial Dark theme.
- 44px "Try it" is a clear affordance; the three-line structure (mistake /
  better / punishment) is easy to parse.
- Sits above the explorer, so it reads as a "headline" for the data below rather
  than a competitor.

## Reads badly or confusingly

- "scores 35%" is not self-explanatory: win rate? score incl. draws? Needs a
  label or tooltip ("wins 35% of games").
- "(63% find it, 69%)" is cryptic: the second number has no noun. Too dense on
  the punishment line.
- "5...Nxd5?" is two moves beyond the page position (after 4...d5 5.exd5); the
  lead text in the kicker is small grey and easy to miss, so the mistake looks
  like it applies to the board shown. The board does not match the panel.
- The "?" annotation is editorial, yet the data only says "common and scores
  lower": possible mislabel when a move is merely less good.
- Stafford case: "Better: 6...Bc5 for Black" is the opponent's reply, not an
  alternative for White: confusing. The genuinely better White move is unnamed,
  so the "what scores better" line is missing in that case.
- Competes with Next moves: both are "moves + percentages" in adjacent cards,
  with different percent meanings (share vs score). The panel's orange rule and
  button are louder than the explorer card, pulling attention.
- Needs the band: the panel says "1400" but the explorer's band pills
  (All/Beginner/...) sit right under it and say "All"; two rating contexts one
  scroll apart.
- Where it should sit: probably after Next moves (or inside the explorer card,
  tied to the band selector), not above; or a one-line collapsed teaser under
  the board with the detail expanding. Above-explorer is acceptable only if
  shortened.

## Diff of the page wiring (component files were new, untracked, and have been removed)

```diff
diff --git a/packages/web/src/pages/OpeningDetailPage.tsx b/packages/web/src/pages/OpeningDetailPage.tsx
index 7caad0f..1b87fd0 100644
--- a/packages/web/src/pages/OpeningDetailPage.tsx
+++ b/packages/web/src/pages/OpeningDetailPage.tsx
@@ -13,6 +13,7 @@ import {
 import type { Study, SearchLinks } from '../components/detail/StudiesGallery';
 import MobileDataSurface from '../components/detail/mobile/MobileDataSurface';
 import MobileResources from '../components/detail/mobile/MobileResources';
+import { MistakePanel } from '../components/detail/MistakePanel';
 import PositionSheet from '../components/detail/mobile/PositionSheet';
 import styles from './OpeningDetailPage.module.css';
 import practiceStyles from '../components/detail/PracticeControls.module.css';
@@ -1430,6 +1431,8 @@ const OpeningDetailPage: React.FC = () => {
               </div>
             )}

+            <MistakePanel fen={opening.fen} />
+
             <MobileDataSurface
               fen={opening.fen}
               band={band}
```

Component: ~75-line MistakePanel.tsx + 35-line module CSS (deleted after the
spike).

## Orchestrator's review (night 8)

- The Stafford screenshots were deleted: the subagent filled "6.d3? scores 15%"
  as 100 − 85, not from data. A throwaway, but this repo is public and the rule
  is never to render a made-up number.
- Copy: "scores 35%" is jargon. Plain form to try next: "1 in 3 Black players at
  your level play 5...Nxd5 and lose most of these games: 6.Nxf7 follows (the
  Fried Liver Attack)". The name is the ECO name of the punished position —
  data, not prose.
- **"Better" picked by top score misleads.** It chose 5...b5 (7% play it, 56%)
  over the book move 5...Na5 (47% play it, 50%). Highest score among small
  shares is partly selection (who plays offbeat moves). Next version: name the
  most played move that scores clearly better, and say the score only.
- The panel must follow the page's band pill (it said 1400 beside "All").
- Placement: one screen down at 390 px, above the explorer. Better as a one-line
  teaser under the move row, expanding in place.

/**
 * Level-check comparison (deviation-trainer PRD §5.2): masters score vs a
 * club band's score for the side to move, surfaced only when the discrepancy
 * is significant. Thresholds start at ≥8 percentage points and ≥100 games per
 * sample (PRD §11) — tuned here, not in components.
 */

import { sideScorePct, type BandId, type ExplorerResult } from './lichessExplorer';

const DEFAULT_MIN_SAMPLE = 100;
const DEFAULT_MIN_GAP_PP = 8;

export interface LevelCheck {
  side: 'White' | 'Black';
  mastersPct: number;
  bandPct: number;
  bandId: BandId;
  direction: 'band-better' | 'masters-better';
}

export function computeLevelCheck(
  masters: ExplorerResult,
  band: ExplorerResult,
  bandId: BandId,
  fen: string,
  opts?: { minSample?: number; minGapPp?: number }
): LevelCheck | null {
  const minSample = opts?.minSample ?? DEFAULT_MIN_SAMPLE;
  const minGapPp = opts?.minGapPp ?? DEFAULT_MIN_GAP_PP;

  if (masters.totalGames < minSample || band.totalGames < minSample) return null;

  const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  const mastersPct = sideScorePct(masters, sideToMove);
  const bandPct = sideScorePct(band, sideToMove);

  // Gap is judged on the unrounded scores; the rounded values are for copy.
  if (Math.abs(mastersPct - bandPct) < minGapPp) return null;

  return {
    side: sideToMove === 'w' ? 'White' : 'Black',
    mastersPct: Math.round(mastersPct),
    bandPct: Math.round(bandPct),
    bandId,
    direction: bandPct > mastersPct ? 'band-better' : 'masters-better',
  };
}

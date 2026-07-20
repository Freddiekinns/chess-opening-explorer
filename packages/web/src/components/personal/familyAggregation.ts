export interface OpeningAggInput {
  key: string;
  name: string;
  eco: string;
  moves?: string;
  family_id?: string;
  family_display_name?: string | null;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface FamilyMeta {
  id: string;
  display_name: string;
}

export interface FamilyVariationRow {
  key: string;
  name: string;
  eco: string;
  moves?: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface FamilyRollupRow {
  family_id: string;
  display_name: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  variation_count: number;
  variations: FamilyVariationRow[];
  best_variation: FamilyVariationRow | null;
  weak_variation: FamilyVariationRow | null;
}

export interface UncategorisedSummary {
  games: number;
  wins: number;
  draws: number;
  losses: number;
  variation_count: number;
  win_rate: number;
}

export interface GroupByFamilyResult {
  rows: FamilyRollupRow[];
  uncategorised: UncategorisedSummary | null;
}

export type SortMode = 'frequency' | 'best' | 'worst';

/**
 * Reserved sentinel for openings without a recognised family. Any input row
 * with `family_id === UNCATEGORISED` (or with a missing/empty `family_id`) is
 * routed into the `uncategorised` summary and never appears in `rows`. Real
 * family taxonomies must not use this string as a family id.
 */
const UNCATEGORISED = 'uncategorised';
const QUALIFY_THRESHOLD = 2;

/**
 * Pure win rate (wins / games). Deliberately NOT draw-weighted: the label
 * everywhere is "win rate", and the flat all-openings sort + highlight cards
 * use the same wins/games definition — so family sorting matches them exactly.
 */
function winRate(games: number, wins: number): number {
  return games === 0 ? 0 : wins / games;
}

/** Fallback display name when the families dict hasn't loaded: turn a slug like
 *  "kings-indian" into "Kings Indian" so rows never show raw ids. */
function prettifyFamilyId(id: string): string {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function groupByFamily(
  input: OpeningAggInput[],
  families: Record<string, FamilyMeta>,
  sortMode: SortMode = 'frequency'
): GroupByFamilyResult {
  const buckets = new Map<string, FamilyRollupRow>();
  // Always-non-null accumulator + presence flag — avoids the closure-mutation
  // pattern that confuses TypeScript's control-flow narrowing.
  const uncat: UncategorisedSummary = {
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    variation_count: 0,
    win_rate: 0,
  };
  let hasUncategorised = false;

  for (const row of input) {
    const id = row.family_id && row.family_id.length > 0 ? row.family_id : UNCATEGORISED;

    if (id === UNCATEGORISED) {
      hasUncategorised = true;
      uncat.games += row.games;
      uncat.wins += row.wins;
      uncat.draws += row.draws;
      uncat.losses += row.losses;
      uncat.variation_count += 1;
      continue;
    }

    const fromDict = families[id]?.display_name;
    const display = fromDict || row.family_display_name || prettifyFamilyId(id);

    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = {
        family_id: id,
        display_name: display,
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        score: 0,
        variation_count: 0,
        variations: [],
        best_variation: null,
        weak_variation: null,
      };
      buckets.set(id, bucket);
    }
    bucket.games += row.games;
    bucket.wins += row.wins;
    bucket.draws += row.draws;
    bucket.losses += row.losses;
    bucket.variations.push({
      key: row.key,
      name: row.name,
      eco: row.eco,
      moves: row.moves,
      games: row.games,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
    });
  }

  for (const bucket of buckets.values()) {
    bucket.variation_count = bucket.variations.length;
    bucket.score = winRate(bucket.games, bucket.wins);
    bucket.variations.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

    const qualified = bucket.variations.filter((v) => v.games >= QUALIFY_THRESHOLD);
    if (qualified.length > 0) {
      const ranked = [...qualified].sort((a, b) => {
        const wrDiff = winRate(b.games, b.wins) - winRate(a.games, a.wins);
        if (wrDiff !== 0) return wrDiff;
        return b.games - a.games;
      });
      // Spread copies isolate best/weak from `bucket.variations` — downstream
      // consumers (UI components) freely mutate UI-state alongside the data,
      // so a shared object reference here would leak across the rollup row.
      bucket.best_variation = { ...ranked[0] };
      bucket.weak_variation = { ...ranked[ranked.length - 1] };
    }
  }

  if (hasUncategorised) {
    uncat.win_rate = winRate(uncat.games, uncat.wins);
  }

  const rows = Array.from(buckets.values());
  rows.sort((a, b) => {
    if (sortMode === 'best') {
      const diff = b.score - a.score;
      if (diff !== 0) return diff;
    } else if (sortMode === 'worst') {
      const diff = a.score - b.score;
      if (diff !== 0) return diff;
    }
    // Tie-break (and primary key for `'frequency'`): games desc, then
    // display_name alphabetically. Same secondary key for all modes — when
    // two families share an identical score in `'best'`/`'worst'` mode, we
    // prefer the higher-volume family.
    const games = b.games - a.games;
    if (games !== 0) return games;
    return a.display_name.localeCompare(b.display_name);
  });

  return { rows, uncategorised: hasUncategorised ? uncat : null };
}

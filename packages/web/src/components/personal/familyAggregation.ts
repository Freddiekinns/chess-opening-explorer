export interface OpeningAggInput {
  key: string;
  name: string;
  eco: string;
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

const UNCATEGORISED = 'uncategorised';
const QUALIFY_THRESHOLD = 2;

function winRate(games: number, wins: number, draws: number): number {
  return games === 0 ? 0 : (wins + 0.5 * draws) / games;
}

export function groupByFamily(
  input: OpeningAggInput[],
  families: Record<string, FamilyMeta>,
  sortMode: SortMode = 'frequency'
): GroupByFamilyResult {
  const buckets = new Map<string, FamilyRollupRow>();
  let uncategorised: UncategorisedSummary | null = null;

  const ensureUncategorised = (): UncategorisedSummary => {
    if (!uncategorised) {
      uncategorised = {
        games: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        variation_count: 0,
        win_rate: 0,
      };
    }
    return uncategorised;
  };

  for (const row of input) {
    const id = row.family_id && row.family_id.length > 0 ? row.family_id : UNCATEGORISED;

    if (id === UNCATEGORISED) {
      const u = ensureUncategorised();
      u.games += row.games;
      u.wins += row.wins;
      u.draws += row.draws;
      u.losses += row.losses;
      u.variation_count += 1;
      continue;
    }

    const fromDict = families[id]?.display_name;
    const display = fromDict || row.family_display_name || id;

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
      games: row.games,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
    });
  }

  for (const bucket of buckets.values()) {
    bucket.variation_count = bucket.variations.length;
    bucket.score = winRate(bucket.games, bucket.wins, bucket.draws);
    bucket.variations.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));

    const qualified = bucket.variations.filter((v) => v.games >= QUALIFY_THRESHOLD);
    if (qualified.length > 0) {
      const ranked = [...qualified].sort((a, b) => {
        const wrDiff = winRate(b.games, b.wins, b.draws) - winRate(a.games, a.wins, a.draws);
        if (wrDiff !== 0) return wrDiff;
        return b.games - a.games;
      });
      bucket.best_variation = ranked[0];
      bucket.weak_variation = ranked[ranked.length - 1];
    }
  }

  if (uncategorised) {
    uncategorised.win_rate = winRate(uncategorised.games, uncategorised.wins, uncategorised.draws);
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
    const games = b.games - a.games;
    if (games !== 0) return games;
    return a.display_name.localeCompare(b.display_name);
  });

  return { rows, uncategorised };
}

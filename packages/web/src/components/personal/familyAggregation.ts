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
}

const UNCATEGORISED = 'uncategorised';

export function groupByFamily(
  input: OpeningAggInput[],
  families: Record<string, FamilyMeta>
): FamilyRollupRow[] {
  const buckets = new Map<string, FamilyRollupRow>();

  for (const row of input) {
    const id = row.family_id && row.family_id.length > 0 ? row.family_id : UNCATEGORISED;
    const fromDict = families[id]?.display_name;
    const display = id === UNCATEGORISED ? 'Other' : fromDict || row.family_display_name || id;

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
    bucket.score = bucket.games === 0 ? 0 : (bucket.wins + 0.5 * bucket.draws) / bucket.games;
    bucket.variations.sort((a, b) => b.games - a.games || a.name.localeCompare(b.name));
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.games - a.games || a.display_name.localeCompare(b.display_name)
  );
}

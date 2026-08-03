/**
 * The repertoire's thumb on the scale.
 *
 * The Saved pill was the visible half of an idea whose useful half never
 * shipped: rows said which openings you already keep, and then ranked them as
 * if you didn't. Between two matches the search cannot separate, the one you
 * have already chosen is the better answer — you are far more likely to be
 * returning to it than discovering it.
 *
 * What this deliberately does not do is float every saved opening to the top.
 * A repertoire entry that matches the query weakly is still a weak match, and
 * dragging it above twenty better ones would make search worse for the users
 * who have most invested in the product. So the promotion only happens *within
 * a tie* — the server's own `searchScore` decides what counts as one.
 *
 * The band is relative, not absolute, because the score scales differ by an
 * order of magnitude between search types: a move search returns 1.5s, a name
 * search 5.4s, a semantic search 0.41s. A fixed epsilon would mean "identical"
 * on one path and "anything at all" on another.
 */

/** Within 2% of the band leader's score is the same answer, twice. */
const TIE_BAND = 0.98;

export interface RankableResult {
  searchScore?: number;
  saved?: boolean;
}

/**
 * Stable: results keep the server's order except where a saved opening passes
 * an unsaved one it was tied with.
 *
 * Bands are measured from the leader rather than the previous result, so a long
 * gentle decay cannot chain a whole list into one band — 5.0 and 4.7 are not
 * ties just because every step between them was small.
 *
 * A list whose results carry no `searchScore` is returned untouched. Nothing
 * there says which pairs are close, and inventing an answer would be the
 * fabricated-data trap in a different costume.
 */
export function promoteSaved<T extends RankableResult>(results: T[]): T[] {
  if (results.length < 2) return results;
  if (results.some((result) => typeof result.searchScore !== 'number')) return results;
  if (!results.some((result) => result.saved)) return results;

  const promoted: T[] = [];
  let band: T[] = [];
  let bandFloor = Number.POSITIVE_INFINITY;

  const flush = () => {
    // Two stable passes rather than a comparator: Array.prototype.sort is only
    // guaranteed stable, not order-preserving for equal keys across engines we
    // do not control, and "unchanged unless saved" is the whole contract.
    promoted.push(...band.filter((result) => result.saved), ...band.filter((r) => !r.saved));
    band = [];
  };

  for (const result of results) {
    const score = result.searchScore as number;
    if (band.length > 0 && score < bandFloor) {
      flush();
    }
    if (band.length === 0) {
      bandFloor = score * TIE_BAND;
    }
    band.push(result);
  }
  flush();

  return promoted;
}

/**
 * Surprise me, fetched once.
 *
 * Three surfaces offer this row and each used to own the same eight lines: the
 * request, the `success && data` check, and a swallowed error. Nothing about
 * them differed, which is the problem — the reasoning for the swallow survived
 * in one copy of three ("a failed surprise is not worth an error state") and
 * the other two just said "silent fail". The next thing this gains — a loading
 * state, skipping the opening you are already on, analytics — would have had to
 * be added three times or it would quietly become three behaviours.
 *
 * What each caller keeps is what genuinely differs: the overlay closes itself
 * before navigating, the other two only navigate.
 *
 * Returns null rather than throwing. A surprise that does not arrive is not
 * worth an error state — the search field is right there, and it is the thing
 * the user came for.
 */

export interface RandomOpening {
  fen: string;
}

export async function fetchRandomOpening(): Promise<RandomOpening | null> {
  try {
    const response = await fetch('/api/openings/random');
    if (!response.ok) return null;
    const data = await response.json();
    return data?.success && data.data?.fen ? (data.data as RandomOpening) : null;
  } catch {
    return null;
  }
}

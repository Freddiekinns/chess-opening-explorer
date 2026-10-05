/**
 * An opening's style tags as the API sends them (`style_profile`): the shown
 * words of docs/style-taxonomy.md in its order, and up to two plans, each with
 * the glossary line used as its tooltip. Null for positions with no tags — hubs
 * such as 1.e4, and variations not classified yet.
 */
export interface StyleProfile {
  words: { axis: string; value: string; label: string; glossary: string }[];
  plans: { key: string; label: string; glossary: string }[];
}

/** The level word, when one is shown (Beginner or Advanced). */
export function levelLabel(profile: StyleProfile | null | undefined): string | undefined {
  return profile?.words.find((w) => w.axis === 'level')?.label;
}

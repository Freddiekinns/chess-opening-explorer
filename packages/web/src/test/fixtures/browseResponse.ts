/** One fake /api/openings/browse payload, shared by every filter-bar test. */
export const browseItem = (name: string, fen: string) => ({
  fen,
  name,
  eco: 'B20',
  moves: '1. e4 c5',
  family_id: 'sicilian',
  family_name: 'Sicilian Defense',
  level: 'Advanced',
  style: 'aggressive',
  games_analyzed: 1200,
  white_win_rate: 0.5,
  draw_rate: 0.1,
  black_win_rate: 0.4,
  avg_rating: 1600,
  analysis_json: { complexity: 'Advanced', style_tags: ['Aggressive'] },
});

export const browseResponse = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  items: [browseItem('Sicilian Defence', 'fen-1'), browseItem('Ruy Lopez', 'fen-2')],
  total: 30,
  page: 1,
  pageSize: 12,
  offset: 0,
  remaining: 28,
  facets: {
    level: [
      { value: 'Beginner', label: 'Beginner', count: 5 },
      { value: 'Intermediate', label: 'Intermediate', count: 10 },
      { value: 'Advanced', label: 'Advanced', count: 15 },
    ],
    style: [
      { value: 'gambit', label: 'Gambit', count: 12 },
      { value: 'aggressive', label: 'Aggressive', count: 18 },
    ],
    family: [
      { value: 'sicilian', label: 'Sicilian Defense', count: 20, first_move: 'e4' },
      { value: 'london', label: 'London System', count: 7, first_move: 'd4' },
      { value: 'uncategorised', label: 'Other', count: 3, first_move: null },
    ],
  },
  applied: { level: null, style: null, family: null, sort: 'popular' },
  ...overrides,
});

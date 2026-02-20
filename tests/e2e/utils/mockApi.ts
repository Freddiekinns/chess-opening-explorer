import type { Page, Route } from '@playwright/test';

export type TestOpening = {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
  analysis_json?: {
    popularity?: number;
    complexity?: string;
  };
  games_analyzed?: number;
};

export const testOpenings: TestOpening[] = [
  {
    fen: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    name: 'Sicilian Defense',
    eco: 'B50',
    moves: '1. e4 c5 2. Nf3 d6',
    src: 'mock',
    analysis_json: { popularity: 55, complexity: 'Intermediate' },
    games_analyzed: 120000,
  },
  {
    fen: 'rnbqkbnr/ppp1pppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    name: 'French Defense',
    eco: 'C00',
    moves: '1. e4 e6 2. d4 d5',
    src: 'mock',
    analysis_json: { popularity: 42, complexity: 'Beginner' },
    games_analyzed: 90000,
  },
  {
    fen: 'rnbqkbnr/ppp1pppp/3p4/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    name: "Queen's Gambit",
    eco: 'D06',
    moves: '1. d4 d5 2. c4',
    src: 'mock',
    analysis_json: { popularity: 38, complexity: 'Advanced' },
    games_analyzed: 75000,
  },
];

const testVideos = [
  {
    id: 'vid-1',
    title: 'Sicilian Defense Basics',
    channel: 'Opening Lab',
    duration: 420,
    views: 12000,
    published: '2024-01-15',
    thumbnail: 'https://img.youtube.com/vi/abc123/default.jpg',
    url: 'https://www.youtube.com/watch?v=abc123',
    score: 0.9,
  },
];

const testStudies = [
  {
    course_title: 'Sicilian Defense Essentials',
    author: 'Study Author',
    platform: 'lichess',
    source_url: 'https://lichess.org/study/abc123',
    anchor_fens: [testOpenings[0].fen],
    curated: true,
    likes: 1200,
    discovered_at: '2024-01-10',
  },
];

const testRelated = {
  current: {
    fen: testOpenings[0].fen,
    name: testOpenings[0].name,
    eco: testOpenings[0].eco,
    moves: testOpenings[0].moves,
    isEcoRoot: false,
    games_analyzed: 120000,
  },
  ecoCode: 'B50',
  mainline: {
    fen: testOpenings[0].fen,
    name: 'Sicilian Defense: Main Line',
    eco: 'B50',
    moves: testOpenings[0].moves,
    isEcoRoot: true,
    games_analyzed: 150000,
  },
  siblings: [
    {
      fen: testOpenings[1].fen,
      name: 'Sicilian Defense: Alapin',
      eco: 'B22',
      moves: '1. e4 c5 2. c3',
      isEcoRoot: false,
      games_analyzed: 42000,
      complexity: 'Intermediate',
    },
  ],
  counts: { siblings: 1 },
};

const testStats = {
  games_analyzed: 250000,
  white_win_rate: 0.45,
  draw_rate: 0.3,
  black_win_rate: 0.25,
  avg_rating: 2200,
};

const testEcoAnalysis = {
  common_plans: [
    'White: control the center and develop quickly',
    'Black: counterattack on the queenside',
  ],
};

const personalGamesByPlatform: Record<string, string[]> = {
  'chess.com': ['1. e4 c5 2. Nf3 d6', '1. e4 e6 2. d4 d5'],
  lichess: ['1. d4 d5 2. c4', '1. e4 c5 2. Nf3 d6'],
};

function buildPopularByEco(openings: TestOpening[]) {
  const data: Record<string, TestOpening[]> = { A: [], B: [], C: [], D: [], E: [] };
  for (const opening of openings) {
    const key = opening.eco?.charAt(0) || 'A';
    if (!data[key]) data[key] = [];
    data[key].push(opening);
  }
  return data;
}

function fulfillJson(route: Route, payload: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

export async function mockApiRoutes(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/openings/search-index') {
      return fulfillJson(route, { success: true, data: testOpenings });
    }

    if (path === '/api/openings/all') {
      return fulfillJson(route, { success: true, data: testOpenings });
    }

    if (path === '/api/openings/semantic-search' || path === '/api/openings/search') {
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const results = testOpenings.filter((opening) =>
        opening.name.toLowerCase().includes(query)
      );
      return fulfillJson(route, {
        success: true,
        data: results,
        searchType: 'mock',
        totalResults: results.length,
      });
    }

    if (path === '/api/openings/popular-by-eco') {
      const complexity = url.searchParams.get('complexity');
      const openings = complexity
        ? testOpenings.filter((opening) => opening.analysis_json?.complexity === complexity)
        : testOpenings;
      return fulfillJson(route, { success: true, data: buildPopularByEco(openings) });
    }

    if (path.startsWith('/api/openings/fen/') && path.endsWith('/related')) {
      return fulfillJson(route, { success: true, data: testRelated });
    }

    if (path.startsWith('/api/openings/fen/')) {
      const fen = decodeURIComponent(path.replace('/api/openings/fen/', ''));
      const opening = testOpenings.find((entry) => entry.fen === fen);
      if (!opening) {
        return fulfillJson(route, { success: false, error: 'Opening not found' }, 404);
      }
      return fulfillJson(route, { success: true, data: opening });
    }

    if (path.startsWith('/api/openings/videos/')) {
      return fulfillJson(route, { success: true, data: testVideos });
    }

    if (path.startsWith('/api/openings/eco-analysis/')) {
      return fulfillJson(route, { success: true, data: testEcoAnalysis });
    }

    if (path.startsWith('/api/courses/')) {
      return fulfillJson(route, {
        success: true,
        courses: testStudies,
        searchLinks: {
          lichess: 'https://lichess.org/study',
          chessable: 'https://www.chessable.com',
        },
      });
    }

    if (path.startsWith('/api/stats/')) {
      return fulfillJson(route, { success: true, data: testStats });
    }

    if (path === '/api/personal/games') {
      const platform = url.searchParams.get('platform') || 'chess.com';
      const gamesPgn = personalGamesByPlatform[platform] || personalGamesByPlatform['chess.com'];
      return fulfillJson(route, { success: true, data: { gamesPgn } });
    }

    return fulfillJson(route, { success: false, error: 'Mock not found' }, 404);
  });
}

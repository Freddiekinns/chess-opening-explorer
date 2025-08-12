// Test fixtures for realistic opening data matching API responses

export const mockOpeningDataComplete = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
  name: 'King\'s Pawn Game',
  eco: 'B00',
  moves: '1.e4',
  src: 'test',
  scid: 'B00-001',
  aliases: {
    'King\'s Pawn Opening': 'Main name variation',
    'e4 Opening': 'Simple notation'
  },
  analysis_json: {
    description: 'The King\'s Pawn Game begins with 1.e4, controlling the center and freeing the bishop and queen. This is one of the most popular and classical opening moves.',
    style_tags: ['Aggressive', 'Classical', 'Center Control'],
    tactical_tags: ['Center Attack', 'Quick Development'],
    positional_tags: ['Space Advantage', 'Piece Activity'],
    player_style_tags: ['Attacking', 'Tactical'],
    phase_tags: ['Opening', 'Early Game'],
    complexity: 'Beginner',
    strategic_themes: ['Control center', 'Develop pieces quickly', 'King safety'],
    common_plans: ['Develop knight to f3', 'Castle kingside', 'Attack center with d4'],
    version: '2.1',
    last_enriched_at: '2024-01-15T10:30:00Z'
  },
  games_analyzed: 15000,
  popularity_rank: 1,
  white_win_rate: 0.48,
  black_win_rate: 0.20,
  draw_rate: 0.32
}

export const mockOpeningDataSimple = {
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  name: 'King\'s Pawn Game: King\'s Knight Variation',
  eco: 'C20',
  moves: '1.e4 e5',
  src: 'test',
  games_analyzed: 12000,
  popularity_rank: 2,
  white_win_rate: 0.49,
  black_win_rate: 0.24,
  draw_rate: 0.27
}

export const mockOpeningsList = [
  mockOpeningDataComplete,
  mockOpeningDataSimple,
  {
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    name: 'Queen\'s Pawn Game',
    eco: 'D00',
    moves: '1.d4',
    src: 'test',
    analysis_json: {
      description: 'The Queen\'s Pawn Game starts with 1.d4, focusing on central control and slower, positional development.',
      style_tags: ['Positional', 'Strategic'],
      complexity: 'Intermediate'
    },
    games_analyzed: 11000,
    popularity_rank: 3,
    white_win_rate: 0.52,
    black_win_rate: 0.18,
    draw_rate: 0.30
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
    name: 'Réti Opening',
    eco: 'A07',
    moves: '1.Nf3',
    src: 'test',
    analysis_json: {
      description: 'The Réti Opening begins with 1.Nf3, a hypermodern approach that controls the center from afar.',
      style_tags: ['Hypermodern', 'Flexible'],
      complexity: 'Advanced'
    },
    games_analyzed: 8000,
    popularity_rank: 4,
    white_win_rate: 0.47,
    black_win_rate: 0.25,
    draw_rate: 0.28
  }
]

// API Response mocks
export const mockApiResponse = {
  success: true,
  data: mockOpeningsList,
  metadata: {
    response_time_ms: 150,
    total_count: 4,
    page: 1,
    limit: 20
  }
}

export const mockApiResponseEmpty = {
  success: true,
  data: [],
  metadata: {
    response_time_ms: 125,
    total_count: 0,
    page: 1,
    limit: 20
  }
}

export const mockApiResponseError = {
  success: false,
  error: 'Database connection failed',
  code: 'DB_ERROR',
  metadata: {
    response_time_ms: 5000,
    timestamp: new Date().toISOString()
  }
}

// Search API specific responses
export const mockSearchResponse = {
  success: true,
  data: mockOpeningsList.slice(0, 2),
  searchType: 'semantic',
  totalResults: 2,
  metadata: {
    response_time_ms: 200,
    query: 'king pawn',
    algorithm: 'semantic_v2'
  }
}

export const mockSearchResponseNoResults = {
  success: true,
  data: [],
  searchType: 'no_results',
  totalResults: 0,
  metadata: {
    response_time_ms: 150,
    query: 'xyz123',
    algorithm: 'semantic_v2'
  }
}

// Video data fixtures
export const mockVideoData = [
  {
    id: 'video-001',
    title: 'King\'s Pawn Game Explained',
    thumbnail: 'https://example.com/thumb1.jpg',
    url: 'https://youtube.com/watch?v=abc123',
    duration: '15:30',
    channel: 'Chess Masters',
    eco_codes: ['B00'],
    quality_score: 0.95
  },
  {
    id: 'video-002',
    title: 'Advanced e4 Strategies',
    thumbnail: 'https://example.com/thumb2.jpg',
    url: 'https://youtube.com/watch?v=def456',
    duration: '22:15',
    channel: 'ChessNetwork',
    eco_codes: ['B00', 'C20'],
    quality_score: 0.88
  }
]

// Stats data fixtures
export const mockStatsData = {
  games_analyzed: 15000,
  white_win_rate: 0.48,
  black_win_rate: 0.20,
  draw_rate: 0.32,
  avg_rating: 1650,
  total_moves: 45000,
  avg_game_length: 42
}

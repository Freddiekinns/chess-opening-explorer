/**
 * Search Constants - Semantic mappings and configuration
 */

// Enhanced semantic mappings for natural language search
const SEMANTIC_MAPPINGS = {
  // Style-based intent mappings
  'aggressive': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice', 'risky', 'dynamic'],
  'attacking': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice', 'kingside attack'],
  'solid': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound', 'positional'],
  'defensive': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound', 'counterattack'],
  'positional': ['positional', 'strategic', 'quiet', 'closed', 'slow', 'maneuvering', 'solid'],
  'tactical': ['tactical', 'sharp', 'aggressive', 'sacrifice', 'attacking', 'combination'],
  'dynamic': ['dynamic', 'unbalanced', 'complex', 'imbalanced', 'volatile', 'sharp'],
  'classical': ['classical', 'traditional', 'main line', 'principled', 'standard'],
  'hypermodern': ['hypermodern', 'fianchetto', 'control center', 'flexible', 'modern'],
  
  // Complexity-based mappings
  'beginner': ['beginner', 'simple', 'easy', 'fundamental', 'basic', 'elementary'],
  'intermediate': ['intermediate', 'moderate', 'standard'],
  'advanced': ['advanced', 'theoretical', 'complex', 'difficult', 'expert', 'master'],
  
  // Opening move patterns
  'queens pawn': ['d4', 'queen\'s pawn', 'queens pawn'],
  'kings pawn': ['e4', 'king\'s pawn', 'kings pawn'],
  'english': ['c4', 'english'],
  'reti': ['nf3', 'reti'],
  'bird': ['f4', 'bird'],
  
  // Response patterns
  'response to d4': ['d4', 'queen\'s pawn'],
  'response to e4': ['e4', 'king\'s pawn'],
  'defense': ['defense', 'defence', 'defensive'],
  'counter': ['counter', 'counterattack', 'counter-attack'],
  
  // Color-specific searches
  'for white': ['white'],
  'for black': ['black'],
  'black options': ['black'],
  'white openings': ['white']
};

// Legacy category mappings (kept for backward compatibility)
const STYLE_CATEGORIES = {
  'attacking': ['aggressive', 'attacking', 'tactical', 'sharp', 'gambit', 'sacrifice'],
  'positional': ['positional', 'strategic', 'quiet', 'closed', 'slow', 'maneuvering'],
  'solid': ['solid', 'safe', 'defensive', 'reliable', 'stable', 'sound'],
  'dynamic': ['dynamic', 'unbalanced', 'complex', 'imbalanced', 'volatile'],
  'classical': ['classical', 'traditional', 'main line', 'principled'],
  'hypermodern': ['hypermodern', 'fianchetto', 'control center', 'flexible'],
  'beginner-friendly': ['beginner', 'simple', 'easy', 'fundamental', 'basic'],
  'advanced': ['advanced', 'theoretical', 'complex', 'difficult', 'expert']
};

// Common query patterns and their intents
const QUERY_PATTERNS = {
  // Pattern: "X openings" or "X for Y"
  STYLE_OPENINGS: /^(aggressive|attacking|solid|defensive|positional|tactical|dynamic|classical|hypermodern|beginner|advanced|simple|complex)\s+(openings?|for\s+\w+|options?)$/i,
  
  // Pattern: "response to X" or "defense against X"
  RESPONSE_TO: /^(response|defense|defence|counter)\s+(to|against)\s+(.+)$/i,
  
  // Pattern: "X for color"
  COLOR_SPECIFIC: /^(.+)\s+(for|as)\s+(white|black)$/i,
  
  // Pattern: "beginner/advanced X"
  COMPLEXITY_SPECIFIC: /^(beginner|intermediate|advanced|simple|complex)\s+(.+)$/i,
  
  // Pattern: specific opening names with modifiers
  OPENING_WITH_MODIFIER: /^(aggressive|solid|tactical|positional|sharp|quiet)\s+(.+)$/i
};

// Fuse.js configuration for fuzzy search
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.4, // Lower = more strict matching
  ignoreLocation: true,
  keys: [
    { name: 'name', weight: 0.4 },
    { name: 'moves', weight: 0.3 },
    { name: 'style_tags', weight: 0.2 },
    { name: 'description', weight: 0.1 }
  ]
};

// Chess move patterns for move detection
const CHESS_MOVE_PATTERNS = [
  /^[a-h][1-8]$/, // Pawn moves: e4, d4, etc.
  /^[nbrqk][a-h][1-8]$/, // Piece moves: nf3, bb5, etc.
  /^o-o-o$/, // Long castling
  /^o-o$/, // Short castling
  /^[a-h]x[a-h][1-8]$/, // Captures: exd5, etc.
  /^[nbrqk]x[a-h][1-8]$/, // Piece captures: nxe5, etc.
];

// Opening name patterns that shouldn't trigger semantic search
const OPENING_NAME_PATTERNS = [
  /\b(queen'?s?\s+gambit|queens?\s+gambit)\b/i,
  /\b(king'?s?\s+indian|kings?\s+indian)\b/i,
  /\b(french\s+defense|french\s+defence)\b/i,
  /\b(sicilian\s+defense|sicilian\s+defence)\b/i,
  /\b(caro\s*-?\s*kann)\b/i,
  /\b(english\s+opening)\b/i,
  /\b(ruy\s+lopez)\b/i,
  /\b(italian\s+game)\b/i,
  /\b(vienna\s+game)\b/i,
  /\b(scotch\s+game)\b/i,
  /\b(alekhine'?s?\s+defense|alekhines?\s+defense)\b/i,
  /\b(scandinavian\s+defense)\b/i,
  /\b(pirc\s+defense)\b/i,
  /\b(modern\s+defense)\b/i,
  /\b(bird'?s?\s+opening|birds?\s+opening)\b/i,
  /\b(nimzo\s*-?\s*indian)\b/i,
  /\b(gr[üu]nfeld\s+defense)\b/i,
  /\b(benoni\s+defense)\b/i,
  /\b(catalan\s+opening)\b/i,
  /\b(dutch\s+defense)\b/i,
  /\b(london\s+system)\b/i,
  /\b(torre\s+attack)\b/i,
  /\b(colle\s+system)\b/i
];

// Terms that could be both semantic descriptors and parts of opening names
const AMBIGUOUS_TERMS = [
  'attacking', 'aggressive', 'tactical', 'sharp', 'solid', 'defensive',
  'gambit', 'defense', 'defence', 'opening', 'variation', 'system',
  'classical', 'modern', 'hypermodern', 'dynamic', 'positional',
  // Add specific opening name patterns that need popularity-first search
  'indian', 'kings', 'queens'  // These cause cross-contamination issues
];

module.exports = {
  SEMANTIC_MAPPINGS,
  STYLE_CATEGORIES,
  QUERY_PATTERNS,
  FUSE_OPTIONS,
  CHESS_MOVE_PATTERNS,
  OPENING_NAME_PATTERNS,
  AMBIGUOUS_TERMS
};

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

// Fuse.js configuration for fuzzy search.
//
// Fuse is the typo net and nothing else now: names are matched literally in
// search/NameIndex.js, moves and ECO codes have exact branches, and style
// queries are parsed for intent. What is left for a fuzzy pass is a misspelling.
//
// `description` used to be a key. Bitap across 12,377 half-page descriptions
// with ignoreLocation cost 850–2,800ms a query and matched almost anything —
// "sicilian" scored 4,269 of 12,377 openings, a third of the corpus, and every
// re-ranking pass downstream existed to undo that. Dropping it and `moves`
// changed the result set by four openings in 1,753 and made the pass 5x faster.
const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.4, // Lower = more strict matching
  ignoreLocation: true,
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'style_tags', weight: 0.3 }
  ]
};

// An ECO code, the shape the user types it: one family letter, two digits.
// Codes are exactly three characters, so this is a whole code and never a
// prefix — `B9` is not a search anyone means.
const ECO_CODE_PATTERN = /^[a-e]\d{2}$/;

// Chess move patterns for move detection
const CHESS_MOVE_PATTERNS = [
  /^[a-h][1-8]$/, // Pawn moves: e4, d4, etc.
  /^[nbrqk][a-h][1-8]$/, // Piece moves: nf3, bb5, etc.
  /^o-o-o$/, // Long castling
  /^o-o$/, // Short castling
  /^[a-h]x[a-h][1-8]$/, // Captures: exd5, etc.
  /^[nbrqk]x[a-h][1-8]$/, // Piece captures: nxe5, etc.
];

module.exports = {
  SEMANTIC_MAPPINGS,
  STYLE_CATEGORIES,
  QUERY_PATTERNS,
  FUSE_OPTIONS,
  ECO_CODE_PATTERN,
  CHESS_MOVE_PATTERNS
};

/**
 * Search Constants - Centralized configuration for semantic search
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

// Search scoring weights
const SCORING_WEIGHTS = {
  EXACT_STYLE_MATCH: 0.2,
  COMPLEXITY_MATCH: 0.3,
  MOVE_PATTERN_MATCH: 0.25,
  NAME_MATCH: 0.4,
  POPULARITY_BOOST_MAX: 0.1,
  DESCRIPTIVE_TAG_BOOST: 1.3,
  BASE_SEMANTIC_SCORE: 0.5
};

module.exports = {
  SEMANTIC_MAPPINGS,
  STYLE_CATEGORIES,
  QUERY_PATTERNS,
  FUSE_OPTIONS,
  SCORING_WEIGHTS
};

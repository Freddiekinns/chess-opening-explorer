/**
 * Quality filtering for course discovery
 * Two-stage filtering: study-level (before PGN fetch) and chapter-level (after parsing)
 *
 * Scoring algorithm combines multiple signals:
 * - Freshness (0-20 points based on last update)
 * - Keyword matching (0-15 points for study name, 0-15 for chapter name)
 * - Move depth (0-20 points, penalize <8 moves)
 * - Blacklist rejection (hard fail)
 */

// --- Constants ---

const OPENING_KEYWORDS = [
  'opening',
  'defense',
  'defence',
  'attack',
  'gambit',
  'variation',
  'repertoire',
  'theory',
  'system',
  'line',
];

const BLACKLIST_TERMS = [
  'q&a',
  'q & a',
  'viewer',
  'question',
  'puzzle',
  'tactic',
  'endgame',
  'composition',
  'game of the',
  'tournament',
  'livestream',
  'blitz session',
  'rapid game',
  'casual',
  'viewer games',
  'game analysis',
  'game review',
  'blitz',
  'rapid',
  'bullet',
];

// Pre-lowercased versions for performance (avoid repeated toLowerCase calls)
const BLACKLIST_TERMS_LOWER = BLACKLIST_TERMS.map((t) => t.toLowerCase());
const OPENING_KEYWORDS_LOWER = OPENING_KEYWORDS.map((k) => k.toLowerCase());

// Freshness scoring thresholds (in days)
const FRESHNESS_THRESHOLDS = {
  oneYear: 365,
  twoYears: 730,
  threeYears: 1095,
};

const FRESHNESS_SCORES = {
  recent: 20, // < 1 year
  moderate: 10, // 1-2 years
  old: 5, // 2-3 years
  veryOld: 0, // 3+ years
};

// Move depth scoring (in half-moves)
const MOVE_DEPTH_SCORING = {
  deep: { threshold: 16, points: 20 }, // 8+ full moves (deep theory)
  good: { threshold: 12, points: 15 }, // 6+ full moves (solid theory)
  minimum: { threshold: 8, points: 10 }, // 4+ full moves (basic theory)
  shallow: { points: -30 }, // <4 full moves (penalty for annotations)
};

// Keyword scoring
const KEYWORD_SCORING = {
  pointsPerKeyword: 5,
  maxPoints: 15,
};

const BASELINE_SCORE = 50;

const DEFAULT_THRESHOLDS = {
  minStudyScore: 40,
  minChapterScore: 50,
  minMoveDepth: 8,
};

// --- Helper Functions ---

/**
 * Check if text contains blacklisted terms (case-insensitive)
 * @param {string} text - Text to check
 * @param {string[]} blacklist - Blacklisted terms
 * @returns {boolean}
 */
function hasBlacklistedTerms(text, blacklist = BLACKLIST_TERMS) {
  if (!text || typeof text !== 'string') return false;
  const lowerText = text.toLowerCase();

  // Use pre-lowercased array for comparison
  const blacklistLower =
    blacklist === BLACKLIST_TERMS ? BLACKLIST_TERMS_LOWER : blacklist.map((t) => t.toLowerCase());

  return blacklistLower.some((term) => lowerText.includes(term));
}

/**
 * Check if text contains opening keywords (case-insensitive)
 * @param {string} text - Text to check
 * @param {string[]} keywords - Opening keywords
 * @returns {boolean}
 */
function hasOpeningKeywords(text, keywords = OPENING_KEYWORDS) {
  if (!text || typeof text !== 'string') return false;
  const lowerText = text.toLowerCase();

  // Use pre-lowercased array for comparison
  const keywordsLower =
    keywords === OPENING_KEYWORDS ? OPENING_KEYWORDS_LOWER : keywords.map((k) => k.toLowerCase());

  return keywordsLower.some((kw) => lowerText.includes(kw));
}

/**
 * Calculate freshness score based on last update
 * @param {string|number|Date} updatedAt - ISO timestamp, Unix timestamp, or Date object
 * @returns {number} Score from 0-20
 */
function calculateFreshnessScore(updatedAt) {
  if (!updatedAt) return FRESHNESS_SCORES.veryOld;

  let updateDate;
  if (typeof updatedAt === 'string') {
    updateDate = new Date(updatedAt);
  } else if (typeof updatedAt === 'number') {
    updateDate = new Date(updatedAt);
  } else if (updatedAt instanceof Date) {
    updateDate = updatedAt;
  } else {
    return FRESHNESS_SCORES.veryOld;
  }

  const ageInDays = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < FRESHNESS_THRESHOLDS.oneYear) return FRESHNESS_SCORES.recent;
  if (ageInDays < FRESHNESS_THRESHOLDS.twoYears) return FRESHNESS_SCORES.moderate;
  if (ageInDays < FRESHNESS_THRESHOLDS.threeYears) return FRESHNESS_SCORES.old;
  return FRESHNESS_SCORES.veryOld;
}

/**
 * Count keyword matches in text (case-insensitive)
 * @param {string} text - Text to check
 * @param {string[]} keywords - Keywords to match
 * @returns {number} Count of matching keywords
 */
function countKeywordMatches(text, keywords = OPENING_KEYWORDS) {
  if (!text || typeof text !== 'string') return 0;
  const lowerText = text.toLowerCase();

  // Use pre-lowercased array for comparison
  const keywordsLower =
    keywords === OPENING_KEYWORDS ? OPENING_KEYWORDS_LOWER : keywords.map((k) => k.toLowerCase());

  return keywordsLower.filter((kw) => lowerText.includes(kw)).length;
}

// --- Core Scoring Functions ---

/**
 * Calculate quality score for a study (study-level filtering)
 * @param {object} study - Study object with name, updatedAt
 * @returns {number} Score from 0-100
 */
function calculateStudyScore(study) {
  if (!study || !study.name) return 0;

  let score = BASELINE_SCORE;

  // Freshness (0-20 points)
  score += calculateFreshnessScore(study.updatedAt);

  // Opening keywords in study name (0-15 points)
  const studyKeywordCount = countKeywordMatches(study.name);
  score += Math.min(studyKeywordCount * KEYWORD_SCORING.pointsPerKeyword, KEYWORD_SCORING.maxPoints);

  return Math.max(0, Math.min(100, score)); // clamp to 0-100
}

/**
 * Calculate quality score for a chapter (chapter-level filtering)
 * @param {object} chapter - Chapter object with chapterName, moves (optional)
 * @param {object} study - Parent study object
 * @returns {number} Score from 0-100
 */
function calculateChapterScore(chapter, study) {
  if (!chapter) return 0;

  let score = BASELINE_SCORE;

  // Inherit freshness from study (0-20 points)
  if (study && study.updatedAt) {
    score += calculateFreshnessScore(study.updatedAt);
  }

  // Opening keywords in chapter name (0-15 points)
  if (chapter.chapterName) {
    const chapterKeywordCount = countKeywordMatches(chapter.chapterName);
    score += Math.min(chapterKeywordCount * KEYWORD_SCORING.pointsPerKeyword, KEYWORD_SCORING.maxPoints);
  }

  // Move depth bonus (0-20 points) or penalty
  if (typeof chapter.moves === 'number') {
    const { deep, good, minimum, shallow } = MOVE_DEPTH_SCORING;

    if (chapter.moves >= deep.threshold) {
      score += deep.points;
    } else if (chapter.moves >= good.threshold) {
      score += good.points;
    } else if (chapter.moves >= minimum.threshold) {
      score += minimum.points;
    } else {
      score += shallow.points;
    }
  }

  return Math.max(0, Math.min(100, score)); // clamp to 0-100
}

// --- Filter Functions ---

/**
 * Filter a study based on quality score and blacklist
 * @param {object} study - Study object with name, updatedAt
 * @param {object} thresholds - { minStudyScore, minChapterScore, minMoveDepth }
 * @returns {{ pass: boolean, score: number, reason: string }}
 */
function filterStudy(study, thresholds = DEFAULT_THRESHOLDS) {
  if (!study || !study.name) {
    return { pass: false, score: 0, reason: 'missing_study_data' };
  }

  // Hard reject: blacklist check
  if (hasBlacklistedTerms(study.name)) {
    return { pass: false, score: 0, reason: 'blacklisted_term' };
  }

  // Hard requirement: at least one opening keyword
  if (!hasOpeningKeywords(study.name)) {
    const score = calculateStudyScore(study);
    return { pass: false, score, reason: 'no_opening_keywords' };
  }

  // Calculate score
  const score = calculateStudyScore(study);

  // Threshold check
  if (score < thresholds.minStudyScore) {
    return { pass: false, score, reason: 'low_study_score' };
  }

  return { pass: true, score, reason: 'passed' };
}

/**
 * Filter a chapter based on quality score, move depth, and blacklist
 * @param {object} chapter - Chapter object with chapterName, moves (optional)
 * @param {object} study - Parent study object
 * @param {object} thresholds - { minStudyScore, minChapterScore, minMoveDepth }
 * @returns {{ pass: boolean, score: number, reason: string }}
 */
function filterChapter(chapter, study, thresholds = DEFAULT_THRESHOLDS) {
  if (!chapter || !chapter.chapterName) {
    return { pass: false, score: 0, reason: 'missing_chapter_data' };
  }

  // Hard reject: blacklist check (chapter name)
  if (hasBlacklistedTerms(chapter.chapterName)) {
    return { pass: false, score: 0, reason: 'blacklisted_chapter' };
  }

  // Hard requirement: minimum move depth
  if (typeof chapter.moves === 'number' && chapter.moves < thresholds.minMoveDepth) {
    const score = calculateChapterScore(chapter, study);
    return { pass: false, score, reason: 'insufficient_moves' };
  }

  // Calculate score
  const score = calculateChapterScore(chapter, study);

  // Threshold check
  if (score < thresholds.minChapterScore) {
    return { pass: false, score, reason: 'low_chapter_score' };
  }

  return { pass: true, score, reason: 'passed' };
}

// --- Exports ---

module.exports = {
  filterStudy,
  filterChapter,
  calculateStudyScore,
  calculateChapterScore,
  hasBlacklistedTerms,
  hasOpeningKeywords,
  calculateFreshnessScore,
  countKeywordMatches,
  DEFAULT_THRESHOLDS,
  OPENING_KEYWORDS,
  BLACKLIST_TERMS,
  FRESHNESS_THRESHOLDS,
  FRESHNESS_SCORES,
  MOVE_DEPTH_SCORING,
  KEYWORD_SCORING,
  BASELINE_SCORE,
};

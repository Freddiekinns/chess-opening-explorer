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
  return blacklist.some((term) => lowerText.includes(term.toLowerCase()));
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
  return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}

/**
 * Calculate freshness score based on last update
 * @param {string|number|Date} updatedAt - ISO timestamp, Unix timestamp, or Date object
 * @returns {number} Score from 0-20
 */
function calculateFreshnessScore(updatedAt) {
  if (!updatedAt) return 0;

  let updateDate;
  if (typeof updatedAt === 'string') {
    updateDate = new Date(updatedAt);
  } else if (typeof updatedAt === 'number') {
    updateDate = new Date(updatedAt);
  } else if (updatedAt instanceof Date) {
    updateDate = updatedAt;
  } else {
    return 0;
  }

  const ageInDays = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 365) return 20;
  if (ageInDays < 730) return 10;
  if (ageInDays < 1095) return 5;
  return 0;
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
  return keywords.filter((kw) => lowerText.includes(kw.toLowerCase())).length;
}

// --- Core Scoring Functions ---

/**
 * Calculate quality score for a study (study-level filtering)
 * @param {object} study - Study object with name, updatedAt
 * @returns {number} Score from 0-100
 */
function calculateStudyScore(study) {
  if (!study || !study.name) return 0;

  let score = 50; // baseline

  // Freshness (0-20 points)
  score += calculateFreshnessScore(study.updatedAt);

  // Opening keywords in study name (0-15 points)
  const studyKeywordCount = countKeywordMatches(study.name);
  score += Math.min(studyKeywordCount * 5, 15);

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

  let score = 50; // baseline

  // Inherit freshness from study (0-20 points)
  if (study && study.updatedAt) {
    score += calculateFreshnessScore(study.updatedAt);
  }

  // Opening keywords in chapter name (0-15 points)
  if (chapter.chapterName) {
    const chapterKeywordCount = countKeywordMatches(chapter.chapterName);
    score += Math.min(chapterKeywordCount * 5, 15);
  }

  // Move depth bonus (0-20 points) or penalty
  if (typeof chapter.moves === 'number') {
    if (chapter.moves >= 16) {
      score += 20; // Deep theory (8+ full moves)
    } else if (chapter.moves >= 12) {
      score += 15; // Good theory (6+ full moves)
    } else if (chapter.moves >= 8) {
      score += 10; // Minimum theory (4+ full moves)
    } else {
      score -= 30; // Penalty for shallow content
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
};

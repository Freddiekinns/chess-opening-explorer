/**
 * Study → opening matching with multi-anchor scoring.
 *
 * Replaces the deepest-FEN-only anchoring: each chapter anchors to every ECO
 * position along its move path, guarded by move-prefix family compatibility
 * (shared with the video pipeline), scored by specificity + family agreement
 * + log-likes + chapter count. Weights live in config/study_matching.json.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(__dirname, '..', '..', '..', 'config', 'study_matching.json');

/**
 * Load scoring config.
 * @param {string} [configPath]
 * @returns {object}
 */
function loadMatchConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath || DEFAULT_CONFIG_PATH, 'utf8'));
}

/**
 * Score one (study, page) match.
 * @param {{ratio: number, familyRelation: 'same'|'compatible'|'unknown', likes: number, chaptersMatched: number}} m
 * @param {object} weights - config.weights
 * @returns {number} integer score
 */
function scoreMatch({ ratio, familyRelation, likes, chaptersMatched }, weights) {
  const positionScore = weights.line_context_base + weights.specificity_scale * ratio;
  const familyBonus =
    familyRelation === 'same'
      ? weights.family_same
      : familyRelation === 'compatible'
        ? weights.family_compatible
        : 0;
  const likesBonus = Math.min(Math.log10((likes || 0) + 1), 5) * weights.likes_per_magnitude;
  const chaptersBonus = Math.min(chaptersMatched || 0, 5) * weights.per_extra_chapter;
  return Math.round(positionScore + familyBonus + likesBonus + chaptersBonus);
}

module.exports = { loadMatchConfig, scoreMatch, DEFAULT_CONFIG_PATH };

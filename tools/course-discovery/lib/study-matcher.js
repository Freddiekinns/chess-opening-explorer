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
const {
  getFamilyFromEco,
  getFamiliesFromTitle,
  compareFamilies,
} = require('../../video-pipeline/lib/opening-families');
const { splitPGNIntoChapters, generateFENsFromPGN, normalizeFEN } = require('./pgn-matcher');

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

/**
 * Every ECO position a chapter's move path passes through.
 * @param {string[]} fens - from generateFENsFromPGN (one per ply)
 * @param {Map<string, {fen, name, eco}>} ecoIndex - from loadECOIndex()
 * @returns {Array<{fen: string, name: string, eco: string, depth: number}>}
 */
function collectChapterAnchors(fens, ecoIndex) {
  const anchors = [];
  const seen = new Set();
  for (let i = 0; i < fens.length; i++) {
    const opening = ecoIndex.get(normalizeFEN(fens[i]));
    if (opening && !seen.has(opening.fen)) {
      seen.add(opening.fen);
      anchors.push({ fen: opening.fen, name: opening.name, eco: opening.eco, depth: i + 1 });
    }
  }
  return anchors;
}

/**
 * Families a study is about: title detectors first; otherwise the majority
 * (>50%) family across the chapters' deepest anchors. [] = unknown.
 * @param {string} studyTitle
 * @param {Array<Array<{eco: string}>>} chapterAnchorSets
 * @returns {string[]}
 */
function inferStudyFamilies(studyTitle, chapterAnchorSets) {
  const fromTitle = getFamiliesFromTitle(studyTitle || '');
  if (fromTitle.length > 0) return fromTitle;

  const counts = new Map();
  let mappable = 0;
  for (const anchors of chapterAnchorSets) {
    if (!anchors || anchors.length === 0) continue;
    const family = getFamilyFromEco(anchors[anchors.length - 1].eco);
    if (!family) continue;
    mappable++;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  for (const [family, count] of counts) {
    if (count > mappable / 2) return [family];
  }
  return [];
}

/**
 * Lichess chapter [Event] headers repeat the study name — sometimes more
 * than once ("Study: Study: Chapter") — so strip the prefix repeatedly
 * until only the chapter's own name remains.
 */
function cleanChapterTitle(studyName, chapterName) {
  let name = (chapterName || '').trim();
  const study = (studyName || '').trim();
  if (!study) return name;

  while (name.length > study.length && name.toLowerCase().startsWith(study.toLowerCase())) {
    const rest = name
      .slice(study.length)
      .replace(/^\s*[:\-–—]\s*/, '')
      .trim();
    if (!rest || rest === name) break;
    name = rest;
  }
  return name;
}

/**
 * True when the page's family diverges from every family the study covers.
 */
function anchorConflictsWithStudy(studyFamilies, pageEco) {
  if (!studyFamilies || studyFamilies.length === 0) return false;
  const pageFamily = getFamilyFromEco(pageEco);
  if (!pageFamily) return false;
  return studyFamilies.every((f) => compareFamilies(f, pageFamily) === 'conflict');
}

/**
 * Match one study to opening pages.
 * @param {{studyId, name, author, likes, pgn, fetched_at?}} study
 * @param {Map} ecoIndex
 * @param {object} config
 * @returns {Map<string, object>} page fen -> schema-v2 entry
 */
function matchStudy(study, ecoIndex, config) {
  const chapters = splitPGNIntoChapters(study.pgn || '');
  const chapterData = chapters.map((chapter) => ({
    chapter,
    anchors: collectChapterAnchors(generateFENsFromPGN(chapter.pgn), ecoIndex),
  }));
  const studyFamilies = inferStudyFamilies(
    study.name,
    chapterData.map((c) => c.anchors)
  );

  // page fen -> best chapter for that page + how many chapters touch it
  const pages = new Map();
  for (const { chapter, anchors } of chapterData) {
    if (anchors.length === 0) continue;
    const deepest = anchors[anchors.length - 1].depth;
    for (const anchor of anchors) {
      if (anchorConflictsWithStudy(studyFamilies, anchor.eco)) continue;
      const ratio = anchor.depth / deepest;
      const existing = pages.get(anchor.fen);
      if (!existing) {
        pages.set(anchor.fen, { chapter, anchor, ratio, count: 1 });
      } else {
        existing.count++;
        if (ratio > existing.ratio) {
          existing.chapter = chapter;
          existing.anchor = anchor;
          existing.ratio = ratio;
        }
      }
    }
  }

  const entries = new Map();
  for (const [fen, { chapter, anchor, ratio, count }] of pages) {
    const pageFamily = getFamilyFromEco(anchor.eco);
    const familyRelation =
      studyFamilies.length === 0 || !pageFamily
        ? 'unknown'
        : studyFamilies.includes(pageFamily)
          ? 'same'
          : 'compatible';
    const score = scoreMatch(
      { ratio, familyRelation, likes: study.likes, chaptersMatched: count },
      config.weights
    );
    if (score < config.min_match_score) continue;

    entries.set(fen, {
      study_title: study.name,
      chapter_title: cleanChapterTitle(study.name, chapter.chapterName),
      study_url: `https://lichess.org/study/${study.studyId}`,
      chapter_url: chapter.chapterId
        ? `https://lichess.org/study/${study.studyId}/${chapter.chapterId}`
        : `https://lichess.org/study/${study.studyId}`,
      author: study.author || '',
      platform: 'Lichess',
      likes: study.likes || 0,
      chapters_matched: count,
      curated: true,
      match: {
        score,
        depth: anchor.depth,
        reason: ratio >= config.covers_position_ratio ? 'covers-position' : 'line-context',
      },
      discovered_at: study.fetched_at || new Date().toISOString(),
    });
  }
  return entries;
}

/**
 * Build the FEN-keyed courses object from all studies: sorted best-first
 * (score, then likes, then study_url for determinism), capped per page.
 */
function buildCoursesIndex(studies, ecoIndex, config) {
  const byFen = {};
  for (const study of studies) {
    for (const [fen, entry] of matchStudy(study, ecoIndex, config)) {
      (byFen[fen] = byFen[fen] || []).push(entry);
    }
  }
  for (const fen of Object.keys(byFen)) {
    byFen[fen].sort(
      (a, b) =>
        b.match.score - a.match.score || b.likes - a.likes || a.study_url.localeCompare(b.study_url)
    );
    byFen[fen] = byFen[fen].slice(0, config.max_studies_per_page);
  }
  return byFen;
}

module.exports = {
  loadMatchConfig,
  scoreMatch,
  collectChapterAnchors,
  inferStudyFamilies,
  cleanChapterTitle,
  matchStudy,
  buildCoursesIndex,
  DEFAULT_CONFIG_PATH,
};

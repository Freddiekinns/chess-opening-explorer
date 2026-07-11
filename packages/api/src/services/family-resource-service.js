/**
 * Family Resource Service — family-level fallback shelves for learning
 * resources (video experience review V1).
 *
 * A video/study is only findable on the exact FEN page it matched, so most
 * pages show an empty gallery. When a page has no exact-position resources,
 * the API falls back to the page's family: the family's best videos/studies
 * across every position in that family, deduplicated and ranked. The UI
 * labels the shelf honestly ("Videos for the <family>") — coverage is solved
 * in the UI, never by loosening match thresholds.
 */

const fs = require('fs');
const path = require('path');
const pathResolver = require('../utils/path-resolver');

const FAMILY_VIDEO_LIMIT = 8;
const FAMILY_COURSE_LIMIT = 6;

class FamilyResourceService {
  /**
   * @param {Object} deps
   * @param {Object} deps.ecoService - provides loadECOData() (fen-keyed dict with family_id)
   * @param {Object} deps.videoAccessService - provides getAllPositions()
   * @param {Object} deps.courseService - provides loadCourseData()
   */
  constructor({ ecoService, videoAccessService, courseService }) {
    this.ecoService = ecoService;
    this.videoAccessService = videoAccessService;
    this.courseService = courseService;

    this.familiesById = null; // families.json metadata
    this.familyVideoIndex = null; // family_id -> ranked Video[]
    this.familyCourseIndex = null; // family_id -> ranked course[]
  }

  /**
   * families.json lives at api/data/ on Vercel and data/ at the repo root in
   * dev — same candidate order as families.routes.js.
   * @private
   */
  _loadFamilies() {
    if (this.familiesById) return this.familiesById;

    this.familiesById = {};
    try {
      const candidates = [
        pathResolver.getDataPath('families.json'),
        path.resolve(__dirname, '..', '..', '..', '..', 'data', 'families.json'),
      ];
      for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
          this.familiesById = JSON.parse(fs.readFileSync(candidate, 'utf8'));
          break;
        }
      }
    } catch {
      // Missing/unreadable families.json degrades to id-only labels.
    }
    return this.familiesById;
  }

  /**
   * Family metadata ({id, display_name, ...}) or null.
   * @param {string} familyId
   */
  getFamily(familyId) {
    if (!familyId) return null;
    return this._loadFamilies()[familyId] || null;
  }

  /**
   * The family a FEN's opening belongs to, or null.
   * @param {string} fen
   * @returns {string|null}
   */
  getFamilyIdForFen(fen) {
    if (!fen) return null;
    const ecoData = this._loadEcoData();
    const opening = ecoData[fen];
    return (opening && opening.family_id) || null;
  }

  /**
   * Fetch the fen-keyed ECO dict once — loadECOData() re-enters the cache
   * layer on every call, which matters when resolving 12k+ positions during
   * the family-index build.
   * @private
   */
  _loadEcoData() {
    if (!this.ecoData) {
      try {
        this.ecoData = this.ecoService.loadECOData() || {};
      } catch {
        this.ecoData = {};
      }
    }
    return this.ecoData;
  }

  /**
   * The family's best videos across all its positions — deduplicated by
   * video id (keeping the highest-scored copy), ranked by match score then
   * views. Built once per process from the consolidated index.
   * @param {string} familyId
   * @param {number} limit
   * @returns {Array} Video objects
   */
  getFamilyVideos(familyId, limit = FAMILY_VIDEO_LIMIT) {
    if (!familyId) return [];
    if (!this.familyVideoIndex) {
      this.familyVideoIndex = this._buildFamilyIndex(
        this.videoAccessService.getAllPositions(),
        (entry) => entry.videos,
        (video) => video.id,
        (a, b) => (b.score || 0) - (a.score || 0) || (b.views || 0) - (a.views || 0)
      );
    }
    return (this.familyVideoIndex.get(familyId) || []).slice(0, limit);
  }

  /**
   * The family's studies across all its anchor positions — deduplicated by
   * study (v2 `study_url`, falling back to v1 `source_url`), keeping each
   * study's best-scored copy, ranked by match score then likes.
   * @param {string} familyId
   * @param {number} limit
   * @returns {Promise<Array>} course objects
   */
  async getFamilyCourses(familyId, limit = FAMILY_COURSE_LIMIT) {
    if (!familyId) return [];
    if (!this.familyCourseIndex) {
      const courseData = (await this.courseService.loadCourseData()) || {};
      const entries = Object.entries(courseData).map(([fen, courses]) => ({
        fen,
        courses: courses || [],
      }));
      this.familyCourseIndex = this._buildFamilyIndex(
        entries,
        (entry) => entry.courses,
        (course) => course.study_url || course.source_url || course.course_title,
        (a, b) =>
          ((b.match && b.match.score) || 0) - ((a.match && a.match.score) || 0) ||
          (b.likes || 0) - (a.likes || 0)
      );
    }
    return (this.familyCourseIndex.get(familyId) || []).slice(0, limit);
  }

  /**
   * Group per-position resources by family, dedupe, and rank.
   * @param {Array<{fen: string}>} entries - per-position entries
   * @param {Function} getItems - entry -> resource array
   * @param {Function} getKey - resource -> dedupe key
   * @param {Function} compare - sort comparator (best first)
   * @returns {Map<string, Array>}
   * @private
   */
  _buildFamilyIndex(entries, getItems, getKey, compare) {
    const byFamily = new Map();

    for (const entry of entries) {
      const familyId = this.getFamilyIdForFen(entry.fen);
      if (!familyId) continue;

      let seen = byFamily.get(familyId);
      if (!seen) {
        seen = new Map();
        byFamily.set(familyId, seen);
      }
      for (const item of getItems(entry)) {
        if (!item) continue;
        const key = getKey(item);
        if (!key) continue;
        const existing = seen.get(key);
        if (!existing || compare(item, existing) < 0) {
          seen.set(key, item);
        }
      }
    }

    const ranked = new Map();
    for (const [familyId, seen] of byFamily) {
      ranked.set(familyId, [...seen.values()].sort(compare));
    }
    return ranked;
  }

  /** Reset lazy caches (tests). */
  resetCache() {
    this.familiesById = null;
    this.familyVideoIndex = null;
    this.familyCourseIndex = null;
    this.ecoData = null;
  }
}

module.exports = { FamilyResourceService, FAMILY_VIDEO_LIMIT, FAMILY_COURSE_LIMIT };

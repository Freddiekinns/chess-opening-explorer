const express = require('express');
const ECOService = require('../services/eco-service');
const TreeService = require('../services/tree-service');
const VideoAccessService = require('../services/video-access-service');
const searchService = require('../services/search-service');
const CourseService = require('../services/course-service');
const BrowseService = require('../services/browse-service');
const styleTags = require('../services/style-tags-service');
const {
  getStatsForFen,
  validatePopularityStats,
} = require('../services/popularity-stats-service');
const { FamilyResourceService } = require('../services/family-resource-service');
const { getVariationWords, titleMentionsVariation } = require('../utils/variation-words');

const router = express.Router();
const ecoService = new ECOService();
const treeService = new TreeService();
const videoAccessService = new VideoAccessService();
const courseService = new CourseService();
const browseService = new BrowseService();
const familyResourceService = new FamilyResourceService({
  ecoService,
  videoAccessService,
  courseService,
});

/**
 * A search result, cut to what a search row is made of.
 *
 * The service returns whole opening records — `analysis_json` and all — so
 * twenty results were 55 KB of JSON to draw twenty lines of name, ECO code and
 * moves. A dropdown repaints on every keystroke and most of these are read on a
 * phone, so the description nobody rendered was the largest part of the cost of
 * searching. `games_analyzed` stays because the client ranks with it;
 * `searchScore` because the client promotes saved openings within a tie.
 */
function toSearchResult(opening) {
  return {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
    games_analyzed: opening.games_analyzed,
    searchScore: opening.searchScore,
  };
}

/**
 * Match-reason annotation (review V2): on sub-variation pages, badge each
 * exact-position video "variation" (title mentions the variation) or
 * "family" (background material). Family-root pages get no badge — there is
 * no variation to cover.
 */
function annotateMatchReason(videos, openingName) {
  const variationWords = getVariationWords(openingName || '');
  if (variationWords.length === 0) return videos;
  return videos.map((video) => ({
    ...video,
    matchReason: titleMentionsVariation(video.title, variationWords) ? 'variation' : 'family',
  }));
}

/**
 * Videos for a position with family fallback (review V1): exact-position
 * matches when they exist, otherwise the family's best videos, honestly
 * attributed via `source` + `family` so the UI can label the shelf.
 */
function getVideosWithFallback(fen, openingName) {
  return videoAccessService.getVideosForPosition(fen).then((exact) => {
    if (exact.length > 0) {
      return {
        videos: annotateMatchReason(exact, openingName),
        source: 'position',
        family: null,
      };
    }

    const familyId = familyResourceService.getFamilyIdForFen(fen);
    const familyVideos = familyResourceService.getFamilyVideos(familyId);
    if (familyVideos.length === 0) {
      return { videos: [], source: 'none', family: null };
    }

    const familyMeta = familyResourceService.getFamily(familyId);
    return {
      videos: familyVideos.map((video) => ({ ...video, matchReason: 'family' })),
      source: 'family',
      family: { id: familyId, name: (familyMeta && familyMeta.display_name) || familyId },
    };
  });
}

/**
 * Studies for a position with the same family fallback as videos.
 */
async function getCoursesWithFallback(fen) {
  const exact = await courseService.getCoursesByFen(fen);
  if (exact.length > 0) {
    return { courses: exact, source: 'position', family: null };
  }

  const familyId = familyResourceService.getFamilyIdForFen(fen);
  const familyCourses = await familyResourceService.getFamilyCourses(familyId);
  if (familyCourses.length === 0) {
    return { courses: [], source: 'none', family: null };
  }

  const familyMeta = familyResourceService.getFamily(familyId);
  return {
    courses: familyCourses,
    source: 'family',
    family: { id: familyId, name: (familyMeta && familyMeta.display_name) || familyId },
  };
}

/**
 * @route GET /api/openings/fen/:fen/tree
 * @desc Get full tree context (ancestors, siblings, children) for an opening
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/fen/:fen/tree', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    const treeContext = treeService.getTreeContext(decodedFen);
    if (!treeContext) {
      return res.status(404).json({ success: false, error: 'Opening not found for this position' });
    }

    res.json({ success: true, data: treeContext });
  } catch (error) {
    console.error('Tree context error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tree context' });
  }
});

/**
 * @route GET /api/openings/fen/:fen/tree/children
 * @desc Get children of an opening (lazy-load for tree expansion)
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/fen/:fen/tree/children', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    const result = treeService.getChildren(decodedFen);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Opening not found for this position' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Tree children error:', error);
    res.status(500).json({ success: false, error: 'Failed to load tree children' });
  }
});

/**
 * @route GET /api/openings/page/:fen
 * @desc Aggregate payload for the opening detail page — opening, stats,
 *       videos, courses and tree context in ONE serverless invocation.
 *       Replaces the page's previous 5-call fan-out across 4 functions
 *       (each with its own cold start); the services are all in-process.
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/page/:fen', async (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    const opening = ecoService.getOpeningByFEN(decodedFen);
    if (!opening) {
      return res.status(404).json({
        success: false,
        error: 'Opening not found for this position',
      });
    }

    // Secondary sections are best-effort: a failure in one must not take the
    // whole page down (mirrors the old behaviour, where each fetch failed
    // independently on the client).
    const safe = async (fn, fallback) => {
      try {
        const value = await fn();
        return value === undefined ? fallback : value;
      } catch {
        return fallback;
      }
    };

    const [stats, videoResult, courses, tree] = await Promise.all([
      safe(() => {
        const s = getStatsForFen(decodedFen);
        return s && validatePopularityStats(s) ? s : null;
      }, null),
      safe(
        () => getVideosWithFallback(decodedFen, opening.name),
        { videos: [], source: 'none', family: null }
      ),
      safe(
        async () => {
          const courseResult = await getCoursesWithFallback(decodedFen);
          return {
            courses: courseResult.courses,
            searchLinks: courseService.getSearchLinks(opening.name || null),
            source: courseResult.source,
            family: courseResult.family,
          };
        },
        { courses: [], searchLinks: null, source: 'none', family: null }
      ),
      safe(() => treeService.getTreeContext(decodedFen), null),
    ]);

    res.json({
      success: true,
      data: {
        opening: { ...opening, style_profile: styleTags.profileFor(decodedFen) },
        stats,
        videos: videoResult.videos,
        videoContext: { source: videoResult.source, family: videoResult.family },
        courses,
        tree,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/random
 * @desc Get random opening for training
 */
router.get('/random', (req, res) => {
  try {
    const opening = ecoService.getRandomOpening();

    res.json({
      success: true,
      data: opening,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// The search index, built once per process and sliced per request
let searchIndexCache = null;
let searchIndexCacheTime = null;
const SEARCH_INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @route GET /api/openings/browse
 * @desc  Filtered, sorted, paginated openings PLUS the facet counts for the
 *        filter bar — computed over the same corpus in the same request, so
 *        the count on screen and the grid contents cannot disagree. Today's
 *        landing page takes its category counts from one fetch and its grid
 *        from another, which is why they never reconcile.
 * @param {string} level  - Beginner | Intermediate | Advanced
 * @param {string} style  - solid | sharp | gambit | dubious | system | offbeat
 * @param {string} family - family_id from families.json (or `uncategorised`)
 * @param {string} sort   - popular (default) | name
 * @param {number} page     - 1-based, default 1
 * @param {number} pageSize - default 24, hard max 48
 */
router.get('/browse', (req, res) => {
  try {
    const config = browseService.getConfig();
    const { level, style, family, sort, page, pageSize } = req.query;

    // Unknown values are rejected rather than ignored: a silent empty result is
    // indistinguishable from a genuine empty filter and sends the client
    // hunting for a data bug.
    const reject = (field, value) =>
      res.status(400).json({
        success: false,
        error: `Unknown ${field}: ${value}`,
      });

    // Matched case-insensitively, then canonicalised. These values live in the
    // URL — shared, bookmarked, retyped — and the casing the corpus happens to
    // use differs per facet ("Beginner", but "aggressive"). A case slip is a
    // typo, not an unknown filter, and used to blank the whole grid.
    const canonical = (values, value) =>
      values.find((candidate) => candidate.toLowerCase() === value.toLowerCase());

    const levelValue = level && canonical(config.levels.map((l) => l.value), level);
    if (level && !levelValue) return reject('level', level);

    // A style from before the taxonomy still filters, on its nearest value.
    // Own keys only: an inherited name ("constructor") is not an alias.
    const retired = config.retiredStyles || {};
    const lower = style && style.toLowerCase();
    const styleKey = style && (Object.hasOwn(retired, lower) ? retired[lower] : style);
    const styleValue = styleKey && canonical(config.styles.map((s) => s.value), styleKey);
    if (style && !styleValue) return reject('style', style);

    const sortValue = sort && canonical(config.sorts.map((s) => s.value), sort);
    if (sort && !sortValue) return reject('sort', sort);

    const familyValue = family && canonical([...browseService.familyIds()], family);
    if (family && !familyValue) return reject('family', family);

    const result = browseService.browse({
      level: levelValue || null,
      style: styleValue || null,
      family: familyValue || null,
      sort: sortValue || config.defaultSort,
      page,
      pageSize,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Browse error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to browse openings',
    });
  }
});

/**
 * @route GET /api/openings/search-index
 * @desc Get lightweight search index for client-side search (names and ECO codes only)
 * @param {number} limit - Max results to return (default: all, can limit for faster initial load)
 */
router.get('/search-index', (req, res) => {
  try {
    const startTime = Date.now();
    const { limit, fields } = req.query;
    const isLookupOnly = fields === 'lookup';

    // A positive whole number or nothing. `-5` used to slice to all but five
    // openings, and `0` or `lots` to the whole index.
    const maxResults = limit === undefined ? null : Number(limit);
    if (maxResults !== null && !(Number.isInteger(maxResults) && maxResults > 0)) {
      return res.status(400).json({
        success: false,
        error: 'limit must be a positive whole number',
      });
    }

    // Built once and sliced per request. The cache used to be keyed on the raw
    // `?limit` string and never evicted, so every distinct value held its own
    // copy of the index, and its one timestamp, reset by each new key, kept
    // older entries alive past their TTL.
    const now = Date.now();
    const cached =
      searchIndexCache !== null && now - searchIndexCacheTime < SEARCH_INDEX_CACHE_TTL;

    if (!cached) {
      // Create lightweight index with only essential search fields
      const rows = ecoService.getAllOpenings().map((opening) => ({
        fen: opening.fen,
        name: opening.name,
        eco: opening.eco,
        moves: opening.moves || '',
        // Only include games_analyzed if available for sorting
        ...(opening.games_analyzed && { games_analyzed: opening.games_analyzed }),
        family_id: opening.family_id,
      }));
      searchIndexCache = {
        rows,
        byPopularity: [...rows].sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0)),
      };
      searchIndexCacheTime = now;
    }

    const { rows, byPopularity } = searchIndexCache;

    // If limit specified, take the top N by games_analyzed
    let searchIndex = maxResults ? byPopularity.slice(0, maxResults) : rows;
    if (isLookupOnly) {
      // The lookup variant is FEN → name only
      searchIndex = searchIndex.map(({ fen, name, eco }) => ({ fen, name, eco }));
    }

    const searchTime = `${Date.now() - startTime}ms`;

    res.json({
      success: true,
      data: searchIndex,
      count: searchIndex.length,
      total_available: rows.length,
      searchTime: cached ? `${searchTime} (cached)` : searchTime,
      note: maxResults
        ? `Top ${searchIndex.length} popular openings for search`
        : 'Complete search index',
      cached,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/all
 * @desc Retired (TASK011): the 24.8 MB full-dataset payload amplified crawler
 *       traffic into origin-transfer bills. Use /search-index or /semantic-search.
 */
router.get('/all', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.status(410).json({
    success: false,
    error: 'Gone. Use /api/openings/search-index or /api/openings/semantic-search.',
  });
});

/**
 * @route GET /api/openings/semantic-search
 * @desc Enhanced semantic search with natural language understanding
 * @param {string} q - Search query (natural language)
 * @param {number} limit - Max results to return (default: 20, max: 50)
 * @param {number} offset - Pagination offset (default: 0)
 */
router.get('/semantic-search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long',
      });
    }

    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 20, 50);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);

    // Use the enhanced search service
    const searchResults = await searchService.search(q, {
      limit: maxResults,
      offset: pageOffset,
    });

    const searchTime = Date.now() - startTime;

    res.json({
      success: true,
      data: searchResults.results.map(toSearchResult),
      count: searchResults.results.length,
      totalResults: searchResults.totalResults,
      hasMore: searchResults.hasMore,
      searchTime: `${searchTime}ms`,
      searchType: searchResults.searchType || 'semantic',
      queryIntent: searchResults.queryIntent,
      query: q,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

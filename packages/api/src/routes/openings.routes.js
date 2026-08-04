const express = require('express');
const ECOService = require('../services/eco-service');
const TreeService = require('../services/tree-service');
const VideoAccessService = require('../services/video-access-service');
const searchService = require('../services/search-service');
const CourseService = require('../services/course-service');
const BrowseService = require('../services/browse-service');
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

// Simple in-memory cache for search results
const searchCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @route POST /api/openings/fen-analysis
 * @desc Get ECO analysis data for a specific FEN position
 * @body {string} fen - FEN string of the position
 */
router.post('/fen-analysis', (req, res) => {
  try {
    const { fen } = req.body;

    if (!fen) {
      return res.status(400).json({
        success: false,
        error: 'FEN string is required in request body',
      });
    }

    // Get analysis data from ECO service by FEN
    const analysisData = ecoService.getECOAnalysisByFEN(fen);

    if (!analysisData) {
      return res.status(404).json({
        success: false,
        error: `No analysis data found for FEN position`,
      });
    }

    res.json({
      success: true,
      data: analysisData,
    });
  } catch (error) {
    console.log('ERROR in FEN-analysis endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/eco/:code
 * @desc Get openings by ECO code
 * @param {string} code - ECO code (e.g., "A00", "B01")
 */
router.get('/eco/:code', (req, res) => {
  try {
    const { code } = req.params;
    const openings = ecoService.getOpeningsByECO(code.toUpperCase());

    res.json({
      success: true,
      data: openings,
      count: openings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/search
 * @desc Search openings by name with caching and performance optimizations
 * @param {string} q - Search query
 * @param {number} limit - Max results to return (default: 10, max: 50)
 */
router.get('/search', (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long',
      });
    }

    // Limit results to prevent performance issues
    const maxResults = Math.min(parseInt(limit) || 10, 50);
    const cacheKey = `${q.toLowerCase()}_${maxResults}`;

    // Check cache first
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({
          success: true,
          data: cached.data,
          count: cached.data.length,
          cached: true,
        });
      } else {
        searchCache.delete(cacheKey);
      }
    }

    const startTime = Date.now();
    const openings = ecoService.searchOpeningsByName(q, maxResults);
    const searchTime = Date.now() - startTime;

    // Cache the result
    if (searchCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }

    searchCache.set(cacheKey, {
      data: openings,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      data: openings,
      count: openings.length,
      searchTime: `${searchTime}ms`,
      cached: false,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

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
 * @route GET /api/openings/fen/:fen
 * @desc Get opening by FEN position
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/fen/:fen', (req, res) => {
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
        opening,
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
 * @route GET /api/openings/fen/:fen/related
 * @desc Get related openings (same ECO code) including mainline + siblings
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/fen/:fen/related', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    if (!decodedFen || typeof decodedFen !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid FEN parameter' });
    }

    const current = ecoService.getOpeningByFEN(decodedFen);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Opening not found for this position' });
    }

    const ecoCode = current.eco;
    if (!ecoCode) {
      return res.status(200).json({
        success: true,
        data: {
          current: sanitize(current),
          ecoCode: null,
          mainline: null,
          siblings: [],
          counts: { siblings: 0 },
        },
      });
    }

    // Fetch all by ECO
    const group = ecoService.getOpeningsByECO(ecoCode) || [];

    // Identify mainline (isEcoRoot) or fallback highest games_analyzed
    let mainline = group.find((o) => o.isEcoRoot === true);
    if (!mainline && group.length > 0) {
      mainline = [...group].sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))[0];
    }

    const siblings = group
      .filter((o) => o.fen !== decodedFen) // exclude current
      .sort((a, b) => {
        // mainline priority handled separately; here just games_analyzed desc then name
        const diff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '');
      });

    const payload = {
      current: sanitize(current),
      ecoCode,
      mainline: mainline ? sanitize(mainline) : null,
      siblings: siblings.map(sanitize),
      counts: { siblings: siblings.length },
    };

    return res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Related openings error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load related openings' });
  }
});

// Helper to minimize payload surface
function sanitize(opening) {
  if (!opening) return null;
  return {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
    isEcoRoot: opening.isEcoRoot === true,
    games_analyzed: opening.games_analyzed || 0,
    // Pass through complexity if present from analysis_json (used in teaser tag)
    complexity:
      opening.analysis_json && opening.analysis_json.complexity
        ? opening.analysis_json.complexity
        : opening.complexity || null,
  };
}

/**
 * @route GET /api/openings/classification/:classification
 * @desc Get openings by classification (A, B, C, D, E)
 * @param {string} classification - Classification letter (A, B, C, D, E)
 */
router.get('/classification/:classification', (req, res) => {
  try {
    const { classification } = req.params;
    const upperClass = classification.toUpperCase();

    if (!['A', 'B', 'C', 'D', 'E'].includes(upperClass)) {
      return res.status(400).json({
        success: false,
        error: 'Classification must be A, B, C, D, or E',
      });
    }

    const openings = ecoService.getOpeningsByClassification(upperClass);

    res.json({
      success: true,
      data: openings,
      count: openings.length,
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

/**
 * @route GET /api/openings/categories
 * @desc Get all ECO categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = ecoService.getECOCategories();

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/stats
 * @desc Get opening database statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = ecoService.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Cache for search results
let searchIndexCache = null;
let searchIndexCacheTime = null;
const SEARCH_INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @route GET /api/openings/popular
 * @desc Get popular openings sorted by absolute game count (games_analyzed)
 * @param {number} limit - Max results to return (default: 12, max: 50)
 */
router.get('/popular', (req, res) => {
  try {
    const { limit = 12, complexity } = req.query;

    const result = ecoService.getPopularOpenings(limit, complexity);

    res.json({
      success: true,
      data: result.data,
      count: result.count,
      total_analyzed: result.total_analyzed,
      source: result.source,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/popular-by-eco
 * @desc Get top openings by ECO category for optimized grid display
 * @param {number} limit - Max results per category (default: 6, max: 20)
 */
router.get('/popular-by-eco', (req, res) => {
  try {
    const { limit = 6, complexity, category } = req.query;

    const result = ecoService.getPopularOpeningsByECO(category, limit, complexity);

    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/browse
 * @desc  Filtered, sorted, paginated openings PLUS the facet counts for the
 *        filter bar — computed over the same corpus in the same request, so
 *        the count on screen and the grid contents cannot disagree. Today's
 *        landing page takes its category counts from one fetch and its grid
 *        from another, which is why they never reconcile.
 * @param {string} level  - Beginner | Intermediate | Advanced
 * @param {string} style  - gambit | aggressive | tactical | positional | solid | system
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

    const styleValues = [config.gambitOverride, ...config.styles].map((s) => s.value);
    const styleValue = style && canonical(styleValues, style);
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

    // Check cache first (fields variant must not collide with the full payload)
    const baseKey = limit ? `limited_${limit}` : 'full';
    const cacheKey = isLookupOnly ? `${baseKey}_lookup` : baseKey;
    const now = Date.now();

    if (
      searchIndexCache &&
      searchIndexCache[cacheKey] &&
      searchIndexCacheTime &&
      now - searchIndexCacheTime < SEARCH_INDEX_CACHE_TTL
    ) {
      const cached = searchIndexCache[cacheKey];
      res.json({
        ...cached,
        searchTime: `${Date.now() - startTime}ms (cached)`,
        cached: true,
      });
      return;
    }

    const allOpenings = ecoService.getAllOpenings();

    // Create lightweight index with only essential search fields
    let searchIndex = allOpenings.map((opening) => ({
      fen: opening.fen,
      name: opening.name,
      eco: opening.eco,
      ...(isLookupOnly ? {} : { moves: opening.moves || '' }),
      // Only include games_analyzed if available for sorting
      ...(isLookupOnly ? {} : opening.games_analyzed && { games_analyzed: opening.games_analyzed }),
      // family_id only on full search-index (lookup branch is FEN→name only)
      ...(isLookupOnly ? {} : { family_id: opening.family_id }),
    }));

    // If limit specified, prioritize by games_analyzed and take top N
    if (limit) {
      const maxResults = Math.min(parseInt(limit) || searchIndex.length, searchIndex.length);
      searchIndex = searchIndex
        .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
        .slice(0, maxResults);
    }

    const searchTime = Date.now() - startTime;

    const response = {
      success: true,
      data: searchIndex,
      count: searchIndex.length,
      total_available: allOpenings.length,
      searchTime: `${searchTime}ms`,
      note: limit
        ? `Top ${searchIndex.length} popular openings for search`
        : 'Complete search index',
      cached: false,
    };

    // Cache the result
    if (!searchIndexCache) searchIndexCache = {};
    searchIndexCache[cacheKey] = response;
    searchIndexCacheTime = now;

    res.json(response);
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
 * @route GET /api/openings/family/:familyCode
 * @desc Get openings by ECO family (A, B, C, D, E)
 * @param {string} familyCode - ECO family letter (A, B, C, D, E)
 */
router.get('/family/:familyCode', (req, res) => {
  try {
    const { familyCode } = req.params;
    const family = familyCode.toUpperCase();

    // Validate family code
    if (!['A', 'B', 'C', 'D', 'E'].includes(family)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid family code. Must be A, B, C, D, or E',
      });
    }

    // Get openings for this family
    const familyOpenings = ecoService.getOpeningsByFamily(family);

    if (!familyOpenings || familyOpenings.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No openings found for family ${family}`,
      });
    }

    res.json({
      success: true,
      data: familyOpenings,
      family: family,
      count: familyOpenings.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/videos/:fen
 * @desc Get videos for a specific chess position
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/videos/:fen', async (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    const opening = ecoService.getOpeningByFEN(decodedFen);
    const result = await getVideosWithFallback(decodedFen, opening ? opening.name : '');

    res.json({
      success: true,
      data: result.videos,
      count: result.videos.length,
      fen: decodedFen,
      source: result.source,
      family: result.family,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load videos',
    });
  }
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

/**
 * @route GET /api/openings/search-suggestions
 * @desc Get intelligent search suggestions based on partial query
 * @param {string} q - Partial search query
 * @param {number} limit - Max suggestions to return (default: 8, max: 15)
 */
router.get('/search-suggestions', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        note: 'Query too short for suggestions',
      });
    }

    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 8, 15);

    // Get basic suggestions from search service
    const suggestions = await searchService.getSuggestions(q, maxResults);

    // Add semantic suggestions for common patterns
    const semanticSuggestions = [];
    const queryLower = q.toLowerCase();

    // Add common natural language patterns
    if (queryLower.includes('aggr') || queryLower.includes('attack')) {
      semanticSuggestions.push('aggressive openings', 'attacking options for black');
    }
    if (queryLower.includes('solid') || queryLower.includes('def')) {
      semanticSuggestions.push('solid response to d4', 'solid defense against e4');
    }
    if (queryLower.includes('begin') || queryLower.includes('easy')) {
      semanticSuggestions.push('beginner queens pawn openings', 'beginner french defense');
    }
    if (queryLower.includes('d4')) {
      semanticSuggestions.push('response to d4', 'solid response to d4');
    }
    if (queryLower.includes('e4')) {
      semanticSuggestions.push('response to e4', 'attacking options for black');
    }

    // Combine and deduplicate
    const allSuggestions = [...new Set([...suggestions, ...semanticSuggestions])];
    const finalSuggestions = allSuggestions.slice(0, maxResults);

    const searchTime = Date.now() - startTime;

    res.json({
      success: true,
      data: finalSuggestions,
      count: finalSuggestions.length,
      searchTime: `${searchTime}ms`,
      query: q,
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/search-by-category
 * @desc Search openings by semantic category
 * @param {string} category - Category name (attacking, solid, beginner, etc.)
 * @param {number} limit - Max results to return (default: 20, max: 50)
 * @param {number} offset - Pagination offset (default: 0)
 */
router.get('/search-by-category', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required',
      });
    }

    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 20, 50);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);

    const searchResults = await searchService.searchByCategory(category, {
      limit: maxResults,
      offset: pageOffset,
    });

    const searchTime = Date.now() - startTime;

    res.json({
      success: true,
      data: searchResults.results,
      count: searchResults.results.length,
      totalResults: searchResults.totalResults,
      hasMore: searchResults.hasMore,
      category: searchResults.category,
      searchTime: `${searchTime}ms`,
    });
  } catch (error) {
    console.error('Category search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * @route GET /api/openings/search-categories
 * @desc Get all available search categories with counts
 */
router.get('/search-categories', async (req, res) => {
  try {
    const startTime = Date.now();

    const categories = await searchService.getCategories();

    const searchTime = Date.now() - startTime;

    res.json({
      success: true,
      data: categories,
      count: categories.length,
      searchTime: `${searchTime}ms`,
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

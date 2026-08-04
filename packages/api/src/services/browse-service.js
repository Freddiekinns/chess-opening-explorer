const fs = require('fs');
const path = require('path');
const pathResolver = require('../utils/path-resolver');
const { getGlobalCache } = require('./cache-service');

// A literal require, never a computed path: this is the first runtime API code
// to read from config/, and Vercel's file tracer cannot follow a path built at
// runtime — the file would be missing from the deployed function.
const facetConfig = require('../../../../config/browse_facets.json');

const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
const INDEX_CACHE_KEY = 'browse-index';
const INDEX_TTL_MS = 60 * 60 * 1000;
const UNCATEGORISED_LABEL = 'Other';

// A family whose commonest first move covers less than this share of it does
// not have a first move. Measured 2026-07-28: 26 of 29 families are >=93% pure;
// Irregular Openings (32%) and uncategorised (48%) are grab bags, and labelling
// them "1. d4" would state a fact the data does not support.
const FIRST_MOVE_PURITY = 0.6;

class BrowseService {
  constructor() {
    this.ecoDir = pathResolver.getECODataPath();
    this.cache = getGlobalCache();
    this.config = facetConfig;
  }

  getConfig() {
    return this.config;
  }

  // cache-service exposes clear(key), not delete(key).
  clearCache() {
    this.cache.clear(INDEX_CACHE_KEY);
  }

  /**
   * One primary style per opening. Openings carry ~7 style tags each and the
   * common tags sit on 60%+ of the corpus, so multi-membership buckets would
   * each match about half of everything — a filter that filters nothing.
   * Assigning exactly one style makes the facet counts partition the corpus.
   */
  primaryStyle(styleTags) {
    const tags = new Set(styleTags || []);
    const override = this.config.gambitOverride;
    if (override.tags.some((t) => tags.has(t))) return override.value;

    let best = null;
    let bestScore = 0;
    for (const bucket of this.config.styles) {
      const score = bucket.tags.filter((t) => tags.has(t)).length;
      // Strict `>` means the first bucket in config order wins a tie.
      if (score > bestScore) {
        bestScore = score;
        best = bucket.value;
      }
    }
    return best;
  }

  loadFamilies() {
    const candidates = [
      pathResolver.getDataPath('families.json'),
      path.resolve(__dirname, '..', '..', '..', '..', 'data', 'families.json'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf8'));
      }
    }
    return {};
  }

  loadPopularity() {
    const statsPath = pathResolver.getPopularityStatsPath();
    if (!fs.existsSync(statsPath)) return {};
    return JSON.parse(fs.readFileSync(statsPath, 'utf8')).positions || {};
  }

  /**
   * A compact projection of the corpus, built once per cold start. Full
   * analysis_json records average ~2 kB each; holding 12,377 of them would
   * duplicate the ECO service's footprint for no benefit here.
   */
  buildIndex() {
    return this.cache.getOrSet(
      INDEX_CACHE_KEY,
      () => {
        const start = Date.now();
        const families = this.loadFamilies();
        const popularity = this.loadPopularity();
        const index = [];

        for (const filename of ECO_FILES) {
          const filePath = path.join(this.ecoDir, filename);
          if (!fs.existsSync(filePath)) continue;
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          for (const [fen, opening] of Object.entries(data)) {
            const analysis = opening.analysis_json || {};
            const styleTags = analysis.style_tags || [];
            const stats = popularity[fen];
            const familyId = opening.family_id || 'uncategorised';
            const familyMeta = families[familyId];

            index.push({
              fen,
              name: opening.name,
              eco: opening.eco,
              moves: opening.moves || '',
              family_id: familyId,
              family_name: (familyMeta && familyMeta.display_name) || UNCATEGORISED_LABEL,
              level: analysis.complexity || null,
              style: this.primaryStyle(styleTags),
              style_tags: styleTags,
              // Real stats or null. Never a zero standing in for "unknown".
              games_analyzed: stats ? stats.games_analyzed || 0 : 0,
              white_win_rate: stats && stats.white_win_rate != null ? stats.white_win_rate : null,
              draw_rate: stats && stats.draw_rate != null ? stats.draw_rate : null,
              black_win_rate: stats && stats.black_win_rate != null ? stats.black_win_rate : null,
              avg_rating: stats && stats.avg_rating != null ? stats.avg_rating : null,
            });
          }
        }

        console.warn(`[cold-start] browse index built in ${Date.now() - start}ms (${index.length})`);
        return index;
      },
      INDEX_TTL_MS
    );
  }

  matches(entry, filters) {
    if (filters.level && entry.level !== filters.level) return false;
    if (filters.style && entry.style !== filters.style) return false;
    if (filters.family && entry.family_id !== filters.family) return false;
    return true;
  }

  /**
   * Standard faceted-search counting: each dimension is counted with its OWN
   * filter dropped and the others applied, so a selected value never zeroes out
   * its siblings and the bar stays navigable.
   */
  countFacet(index, filters, dimension, values) {
    const others = { ...filters, [dimension]: null };
    const key = dimension === 'family' ? 'family_id' : dimension;
    const counts = new Map();

    for (const entry of index) {
      if (!this.matches(entry, others)) continue;
      const value = entry[key];
      if (value == null) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    const applied = filters[dimension];
    return (
      values
        // The applied value is kept even at zero. Dropping it would strip the
        // label the filter bar shows for the user's own selection, and a
        // visible "Beginner 0" explains an empty grid that a missing row does
        // not.
        .filter((v) => counts.get(v.value) > 0 || v.value === applied)
        // Fields are copied explicitly, never spread: the style buckets in
        // config/browse_facets.json carry a `tags` array that must not ship in
        // every response.
        .map((v) => ({
          value: v.value,
          label: v.label,
          count: counts.get(v.value) || 0,
          ...(v.first_move !== undefined ? { first_move: v.first_move } : {}),
        }))
    );
  }

  /** family_id -> commonest first move, or null when no move dominates. */
  familyFirstMoves(index) {
    const countsByFamily = new Map();
    for (const entry of index) {
      const match = /^1\.\s*(\S+)/.exec(entry.moves || '');
      if (!match) continue;
      if (!countsByFamily.has(entry.family_id)) countsByFamily.set(entry.family_id, new Map());
      const counts = countsByFamily.get(entry.family_id);
      counts.set(match[1], (counts.get(match[1]) || 0) + 1);
    }

    const firstMoves = new Map();
    for (const [familyId, counts] of countsByFamily) {
      let top = null;
      let topCount = 0;
      let total = 0;
      for (const [move, count] of counts) {
        total += count;
        if (count > topCount) {
          topCount = count;
          top = move;
        }
      }
      firstMoves.set(familyId, topCount / total >= FIRST_MOVE_PURITY ? top : null);
    }
    return firstMoves;
  }

  familyFacetValues(index) {
    const firstMoves = this.familyFirstMoves(index);
    const seen = new Map();
    for (const entry of index) {
      if (!seen.has(entry.family_id)) {
        seen.set(entry.family_id, {
          value: entry.family_id,
          label: entry.family_name,
          first_move: firstMoves.get(entry.family_id) || null,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  familyIds() {
    return new Set(this.buildIndex().map((entry) => entry.family_id));
  }

  browse(params = {}) {
    const index = this.buildIndex();
    const { pageSize: sizeConfig, defaultSort } = this.config;

    const requestedSize = parseInt(params.pageSize, 10);
    const pageSize = Math.min(
      Number.isFinite(requestedSize) && requestedSize > 0 ? requestedSize : sizeConfig.default,
      sizeConfig.max
    );
    const requestedPage = parseInt(params.page, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const filters = {
      level: params.level || null,
      style: params.style || null,
      family: params.family || null,
    };
    const sort = params.sort || defaultSort;

    const filtered = index.filter((entry) => this.matches(entry, filters));

    if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => {
        const diff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
        // Name tiebreak keeps paging stable — without it, equal game counts
        // could order differently between two requests and a page 2 fetch
        // would repeat or skip rows.
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    }

    const total = filtered.length;
    const offset = Math.min((page - 1) * pageSize, total);
    const items = filtered.slice(offset, offset + pageSize);
    const remaining = total - offset - items.length;

    const styleValues = [this.config.gambitOverride, ...this.config.styles];

    return {
      items: items.map((entry) => this.toItem(entry)),
      total,
      page,
      pageSize,
      offset,
      remaining,
      facets: {
        level: this.countFacet(index, filters, 'level', this.config.levels),
        style: this.countFacet(index, filters, 'style', styleValues),
        family: this.countFacet(index, filters, 'family', this.familyFacetValues(index)),
      },
      applied: { ...filters, sort },
    };
  }

  /**
   * `analysis_json` is included, slimmed: OpeningCard reads
   * `opening.analysis_json?.complexity`, so a browse item drops straight into
   * the existing card with no adapter.
   */
  toItem(entry) {
    return {
      fen: entry.fen,
      name: entry.name,
      eco: entry.eco,
      moves: entry.moves,
      family_id: entry.family_id,
      family_name: entry.family_name,
      level: entry.level,
      style: entry.style,
      games_analyzed: entry.games_analyzed,
      white_win_rate: entry.white_win_rate,
      draw_rate: entry.draw_rate,
      black_win_rate: entry.black_win_rate,
      avg_rating: entry.avg_rating,
      analysis_json: { complexity: entry.level, style_tags: entry.style_tags },
    };
  }
}

module.exports = BrowseService;

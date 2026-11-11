const fs = require('fs');
const path = require('path');
const DatabaseSchema = require('../database/schema-manager.js');
const {
  getFamilyFromEco,
  getFamilyFromTitle,
  getFamiliesFromTitle,
  isFamilyName,
  compareFamilies,
} = require('./opening-families');
const { loadChannelTiers, resolveTier } = require('./channel-tiers');

const CONFIG_DIR = path.join(__dirname, '../../../config');

/**
 * Default scoring weights — overridden by config/video_matching.json so the
 * scorer can be tuned without code changes (followed by pipeline:rematch).
 */
const DEFAULT_MATCHING_CONFIG = {
  min_match_score: 60,
  weights: {
    title_exact: 80,
    content_exact: 60,
    family: 50,
    partial_title: 45,
    abbreviation: 35,
    eco: 20,
    educational: 30,
    speedrun_premium: 25,
    speedrun: 15,
    no_educational_premium: -5,
    no_educational: -25,
    premium_channel: 40,
    standard_channel: 20,
    entertainment_channel: -30,
    duration_ideal: 15,
    duration_good: 10,
    duration_short: -25,
    game_analysis: -60,
    player_vs_player: -60,
    movie: -50,
    variation_specific: 25,
    sub_variation_miss: -40,
    family_mismatch_moderate: -30,
    // A video about one variation, shown on the page of the whole opening
    root_page_variation_video: -40,
    root_page_introduction: 30,
    creator_repeat: -20,
    // Ceiling of the view-count bonus; kept under the specificity swing so an
    // audience can reorder like-for-like videos but never outrank relevance
    popularity_max: 20,
  },
  entertainment_channels: ['chess24', 'world chess', 'fide chess'],
  // Distinctive sub-variation names. A title containing any of these is a
  // specific-variation video, not a generic family overview, so it must not
  // blanket sibling move-notation pages via the family-part fallback (a Dragon
  // video has no business on a Najdorf transposition). Full, tunable list lives
  // in config/video_matching.json; this default is the safety net.
  specific_variation_keywords: [
    'najdorf',
    'dragon',
    'scheveningen',
    'sveshnikov',
    'taimanov',
    'rossolimo',
    'rauzer',
    'sozin',
    'alapin',
    'morra',
    'grand prix',
    'english attack',
    'yugoslav',
    'panov',
    'fantasy',
    'winawer',
    'tarrasch',
    'marshall',
    'meran',
    'grunfeld',
    'benoni',
    'benko',
    'leningrad',
    'moscow',
    'smith-morra',
  ],
  // Prefix modifiers that turn a variation name into a DIFFERENT variation:
  // "Accelerated Dragon" is not the Dragon, "Semi-Slav" is not the Slav,
  // "Reversed Sicilian" is not the Sicilian. A variation word found in a title
  // only ever behind one of these (when the page's own name lacks it) is
  // evidence for a sibling opening, not this page. Tunable copy lives in
  // config/video_matching.json.
  variation_modifiers: [
    'accelerated',
    'hyperaccelerated',
    'hyper-accelerated',
    'hyper',
    'semi',
    'anti',
    'neo',
    'pseudo',
    'reversed',
    'delayed',
  ],
};

/**
 * Detects move notation in opening names, e.g. "Scandinavian: 2.exd5",
 * "Caro-Kann: 2.Nf3", "Scandinavian: 2...Qxd5 3.Nc3".
 */
const MOVE_NOTATION_PATTERN = /\d+\.(?:\.\.)?\s*[a-zA-Z]/;

/**
 * Names the scid-style page names spell without their umlaut. Titles write
 * "Sämisch" and "Grünfeld", so until these were folded the 182 "Saemisch"
 * pages could not be named by any title.
 */
const SPELT_OUT_UMLAUTS = /gruenfeld|saemisch|jaenisch|loewenthal|huebner|moeller/g;

/** Videos one creator can have on a page before `creator_repeat` applies. */
const CREATOR_SLOTS = 2;

/** "10-Minute Chess Openings", "…Explained in 20 Minutes": a timed primer. */
const TIMED_PRIMER = /\b\d+[- ]minutes?\b/;

/** How a title says it introduces an opening rather than explores a line. */
const INTRODUCTION_TITLE =
  /\b(?:introduction|intro|learn|beginners?|basics|crash course|how to play)\b|\b\d+[- ]minutes?\b/;

/**
 * New FEN-based Video Matching System
 * Implements the pipeline overhaul plan with weighted scoring
 */
class VideoMatcher {
  constructor(dbPath, options = {}) {
    this.dbPath = dbPath;
    this.db = new DatabaseSchema(dbPath);
    this.config = this.loadMatchingConfig(options.matchingConfigPath);
    this.channelTiers = this.loadChannelTiers(options.channelsConfigPath);
  }

  /**
   * Load scoring weights/threshold from config, falling back to defaults
   */
  loadMatchingConfig(configPath) {
    const resolvedPath = configPath || path.join(CONFIG_DIR, 'video_matching.json');
    try {
      const fileConfig = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      return {
        ...DEFAULT_MATCHING_CONFIG,
        ...fileConfig,
        weights: { ...DEFAULT_MATCHING_CONFIG.weights, ...(fileConfig.weights || {}) },
      };
    } catch (error) {
      return DEFAULT_MATCHING_CONFIG;
    }
  }

  /**
   * Load channel quality tiers from config/youtube_channels.json — the single
   * source of truth for which channels are premium vs standard educators.
   */
  loadChannelTiers(configPath) {
    return loadChannelTiers(configPath || path.join(CONFIG_DIR, 'youtube_channels.json'));
  }

  /**
   * Classify a video's channel: 'premium' | 'standard' | 'entertainment' | null
   */
  getChannelTier(video) {
    const tier = resolveTier(this.channelTiers, {
      channelId: video.channel_id || video.channelId,
      channelTitle: video.channel_title || video.channelTitle,
    });
    if (tier) return tier;

    const channelTitle = (video.channel_title || video.channelTitle || '').toLowerCase();
    if (!channelTitle) return null;

    if (this.config.entertainment_channels.some((name) => channelTitle.includes(name))) {
      return 'entertainment';
    }

    return null;
  }

  /**
   * Word-boundary term matching. Terms without word characters (e.g. '||')
   * fall back to substring matching. Prevents 'round' matching 'background'
   * or 'kid' matching 'kidding'.
   */
  matchesTerm(text, term) {
    if (!/\w/.test(term)) return text.includes(term);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  }

  /**
   * Lowercase + strip diacritics so "Maróczy" matches "maroczy" in titles,
   * and expand the common "Acc."/"Acc" title shorthand to "accelerated"
   * ("Alapin, Glek, Acc. Dragon" must count on Accelerated Dragon pages).
   */
  normalizeForMatch(text) {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(SPELT_OUT_UMLAUTS, (word) => word.replace(/[aou]e/, (pair) => pair[0]))
      .replace(/\bacc\.?(?=\s|$)/g, 'accelerated');
  }

  /**
   * Boundary-safe, modifier-aware phrase search.
   *
   * A phrase only counts inside `text` on word boundaries — "accelerated
   * dragon" is NOT inside "hyperaccelerated dragon". Plain \b, so hyphenated
   * compounds still expose their parts ("smith" matches in "smith-morra");
   * sibling protection comes from the modifier check instead: an occurrence
   * whose immediately preceding word (across hyphens) is a variation modifier
   * (accelerated, semi, anti, reversed, …) foreign to `openingName` names a
   * SIBLING variation ("semi-slav" is not the Slav, "anti-berlin" is not the
   * Berlin). A trailing s/d is tolerated ("advance" matches "advanced").
   *
   * @returns 'match'    — at least one clean occurrence
   *          'modified' — only modifier-qualified occurrences (sibling)
   *          null       — no boundary occurrence at all
   */
  findPhrase(text, phrase, openingName) {
    const normText = this.normalizeForMatch(text);
    const normPhrase = this.normalizeForMatch(phrase).trim();
    if (!normPhrase) return null;

    const escaped = normPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<!\\w)${escaped}(?:s|d)?(?!\\w)`, 'g');
    const normOpening = this.normalizeForMatch(openingName);
    const modifiers = this.config.variation_modifiers || [];

    let occurrence;
    let sawModified = false;
    while ((occurrence = pattern.exec(normText)) !== null) {
      const before = normText.slice(0, occurrence.index);
      // Preceding word incl. hyphen-joined prefixes ("semi-" and
      // "hyper-accelerated " both yield their modifier)
      const prevWord = (before.match(/([a-z]+(?:-[a-z]+)*)[-\s,:;.]*$/) || [])[1] || '';
      const isForeignModifier =
        prevWord &&
        modifiers.includes(prevWord) &&
        // The page's own name may legitimately carry the modifier
        // ("Semi-Slav" pages allow "semi"; plain-Slav pages don't)
        !new RegExp(`\\b${prevWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(normOpening);
      if (!isForeignModifier) return 'match';
      sawModified = true;
    }
    return sawModified ? 'modified' : null;
  }

  /**
   * True when the phrase has a clean (non-sibling) occurrence in the text.
   */
  phraseMatches(text, phrase, openingName) {
    return this.findPhrase(text, phrase, openingName) === 'match';
  }

  /**
   * Split an opening name's variation part into comma segments of significant
   * words. "Accelerated Dragon, Maróczy Bind" → [['accelerated','dragon'],
   * ['maroczy']]. Move tokens (digits), short words and generic classifiers
   * are dropped; segments that end up empty are removed.
   */
  getVariationSegments(openingName) {
    const colonIndex = (openingName || '').indexOf(':');
    if (colonIndex === -1) return [];

    // NB: 'accepted'/'declined' are NOT stop words — they distinguish real
    // sibling pages ("Smith-Morra Gambit Accepted" vs "…Declined")
    const stopWords = [
      'variation',
      'defense',
      'defence',
      'attack',
      'gambit',
      'system',
      'line',
      'opening',
    ];
    // >3 chars: guard/sibling granularity (all distinguishing words)
    return openingName
      .slice(colonIndex + 1)
      .split(',')
      .map((segment) =>
        segment
          .split(/[\s.\-]+/)
          .map((word) => this.normalizeForMatch(word))
          .filter((word) => word.length > 3 && !/\d/.test(word) && !stopWords.includes(word))
      )
      .filter((words) => words.length > 0);
  }

  /**
   * How well a title covers the page's variation name.
   *
   * Two granularities, mirroring the historical guard (>3-char words) and
   * bonus (>5-char words) filters so short variation names (Lolli, Sozin,
   * Glek) don't trigger the ±bonus swing that would drop generic family
   * videos below the match threshold and empty their pages:
   *
   * - segmentMatched: every >5-char word of at least one comma segment occurs
   *   cleanly in the title — the video names THIS variation (bonus scope).
   * - hasBonusWords: some segment has >5-char words at all — only then does
   *   the ±bonus swing apply.
   * - anyCleanWord: some variation word (>3) occurs cleanly — enough for the
   *   intra-family guard to keep the video.
   * - siblingOnly: variation words occur, but only ever behind a foreign
   *   modifier ("Accelerated Dragon" title on the plain Dragon page) — the
   *   video affirmatively names a different sibling variation.
   */
  analyzeVariationMatch(title, opening) {
    const segments = this.getVariationSegments(opening.name);
    if (segments.length === 0) {
      return {
        hasVariation: false,
        hasBonusWords: false,
        segmentMatched: false,
        anyCleanWord: false,
        siblingOnly: false,
      };
    }

    let hasBonusWords = false;
    let segmentMatched = false;
    let sawClean = false;
    let sawModified = false;
    for (const segmentWords of segments) {
      const results = segmentWords.map((word) => this.findPhrase(title, word, opening.name));
      if (results.includes('match')) sawClean = true;
      if (results.includes('modified')) sawModified = true;

      const bonusResults = results.filter((_, i) => segmentWords[i].length > 5);
      if (bonusResults.length > 0) {
        hasBonusWords = true;
        if (bonusResults.every((result) => result === 'match')) segmentMatched = true;
      }
    }
    return {
      hasVariation: true,
      hasBonusWords,
      segmentMatched,
      anyCleanWord: sawClean,
      siblingOnly: sawModified && !sawClean,
    };
  }

  /**
   * How much of the page's variation a title actually names: 2 = a full
   * segment ("Accelerated Dragon"), 1 = some variation word ("Dragon"),
   * 0 = none. Used to break score ties — see `compareMatches`.
   */
  variationEvidenceRank(title, opening) {
    const variationMatch = this.analyzeVariationMatch((title || '').toLowerCase(), opening);
    if (variationMatch.segmentMatched) return 2;
    if (variationMatch.anyCleanWord) return 1;
    return 0;
  }

  /**
   * The families a title names, cached: the family path asks this once per
   * video and page, which is millions of times in a rematch.
   */
  titleFamilies(title) {
    if (!this.titleFamilyCache) this.titleFamilyCache = new Map();
    let families = this.titleFamilyCache.get(title);
    if (!families) {
      families = getFamiliesFromTitle(title);
      this.titleFamilyCache.set(title, families);
    }
    return families;
  }

  /**
   * The variations of this page that the title names in full, as
   * space-joined words: ['najdorf'], ['accelerated dragon']. Words the page
   * shares with its own family are left out, or "Sicilian Defense: Old
   * Sicilian" would make every Sicilian title a variation video.
   */
  namedVariationSegments(title, opening) {
    const name = opening.name || '';
    const colonIndex = name.indexOf(':');
    if (colonIndex === -1) return [];

    const familyWords = name
      .slice(0, colonIndex)
      .split(/[\s.\-']+/)
      .map((word) => this.normalizeForMatch(word));
    // "King's Indian Attack: Sicilian Variation" is a line of that opening, but
    // a title saying "Sicilian" has named its own family, not that line
    const titleFamilyWords = this.titleFamilies(title).flatMap((family) => family.split('_'));
    return this.getVariationSegments(name)
      .map((words) => words.filter((word) => word.length > 5 && !familyWords.includes(word)))
      .filter(
        (words) =>
          words.length > 0 &&
          !words.every((word) => titleFamilyWords.includes(word.replace(/'/g, ''))) &&
          words.every((word) => this.findPhrase(title, word, name) === 'match')
      )
      .map((words) => words.join(' '));
  }

  /**
   * Distinctive variation names in a title that no page had to confirm:
   * short ones the segment rule skips (Kan, Evans, Morra). A keyword that is
   * only the title's own family (Grünfeld, Benoni) is not a variation of it.
   */
  keywordVariations(title) {
    const familyWords = this.titleFamilies(title).flatMap((family) => family.split('_'));
    return (this.config.specific_variation_keywords || [])
      .filter((keyword) => this.matchesTerm(title, keyword))
      .map((keyword) => this.normalizeForMatch(keyword))
      .filter((keyword) => !keyword.split(/[\s-]+/).every((word) => familyWords.includes(word)));
  }

  /**
   * Decide each video's level, and demote variation videos on root pages.
   *
   * A video is a 'variation' video when its title names a line: a full
   * variation segment of some page it matched, or a variation keyword. Every
   * other matched video is an 'overview'. The level belongs to the video, not
   * the pair, because the family shelf and every root page need the same
   * answer; before it existed the Sicilian Defense root page showed ten
   * sub-variation lectures and no overview, since any title containing
   * "Sicilian Defense" scored the same 80 there.
   *
   * On a page with no variation of its own, a video about a line the page's
   * name does not cover takes `root_page_variation_video`. "The Evans Gambit"
   * is not demoted on the Evans Gambit page, only on the Italian Game's. The
   * videos left are the ones about the opening as a whole, and among those an
   * introduction takes `root_page_introduction`: a root page is where someone
   * meets the opening, and a speedrun game outranked every primer there.
   *
   * On a variation page, a video that names lines, none of them the page's,
   * is dropped: "Caro-Kann: Advance Variation" has no place on the Exchange
   * Variation's page, however well the family matches.
   *
   * @param {Array} matches            pairs from the scoring loop; each carries
   *                                   `named_variations` and a shared `video`
   * @param {Map<string,Object>} openings  opening id → opening, aliases parsed
   * @returns {Array} the matches still at or above the threshold
   */
  applyVideoLevels(matches, openings) {
    const namedByVideo = new Map();
    for (const match of matches) {
      let named = namedByVideo.get(match.video_id);
      if (!named) {
        named = new Set(this.keywordVariations((match.video.title || '').toLowerCase()));
        namedByVideo.set(match.video_id, named);
      }
      for (const segment of match.named_variations || []) named.add(segment);
    }

    const weights = this.config.weights;
    const covers = (page) => (line) => line.split(/[\s-]+/).every((word) => page.includes(word));
    return matches.filter((match) => {
      const named = [...namedByVideo.get(match.video_id)];
      match.video.level = named.length > 0 ? 'variation' : 'overview';

      const opening = openings.get(match.opening_id) || {};
      const name = opening.name || '';
      if (name.includes(':')) {
        // A lecture on other lines of the family: the title names lines and
        // none of them is this page's, under its name or an alias
        const page = this.normalizeForMatch([name, ...(opening.aliases || [])].join(' '));
        return named.length === 0 || named.some(covers(page));
      }

      if (named.every(covers(this.normalizeForMatch(name)))) {
        if (this.isIntroduction((match.video.title || '').toLowerCase())) {
          match.match_score += weights.root_page_introduction;
        }
        return true;
      }

      // Views were added to a video that had already qualified; they must not
      // be what keeps a demoted one
      match.match_score += weights.root_page_variation_video;
      return (
        match.match_score - this.popularityBonus(match.video.view_count) >=
        this.config.min_match_score
      );
    });
  }

  /**
   * A title that introduces an opening: "Learn the Caro-Kann Defense |
   * 10-Minute Chess Openings", "Introduction to the Slav Defense". Speedrun
   * episodes use the same words ("Beginner To Master") for a played game.
   */
  isIntroduction(title) {
    return INTRODUCTION_TITLE.test(title) && !title.includes('speedrun');
  }

  /**
   * Bonus for a proven audience: 0 below 10k views, rising with each order of
   * magnitude to `popularity_max` at about 3M. Only ever added to a video that
   * already cleared the threshold, so views reorder matches and never make one.
   */
  popularityBonus(viewCount) {
    if (!viewCount || viewCount <= 10000) return 0;
    return Math.min(
      this.config.weights.popularity_max,
      Math.round((Math.log10(viewCount) - 4) * 8)
    );
  }

  /**
   * Rank order within one opening: score, then how much of the variation the
   * title names, then proven popularity, then recency.
   *
   * The variation term matters because the ±65 specificity swing only applies
   * to variation names with a >5-char word. Short ones (Smith-Morra, Prins,
   * O'Kelly, Lolli) deliberately get no swing, so every candidate on those
   * pages ties on score and the order fell to view count alone — which is how
   * a Maróczy Bind lecture came to lead the Smith-Morra page over a Naroditsky
   * Smith-Morra speedrun.
   *
   * NB: this rule is implemented twice. This sort picks the top 10 per
   * opening; `getTopVideosForOpening` in database/schema-manager.js re-derives
   * the DISPLAYED order in SQL from the persisted `variation_rank`. Change one
   * and you must change the other, or the ranking chosen here is silently
   * discarded on the way to the JSON — which is exactly what happened when the
   * tie-break existed only here.
   */
  compareMatches(a, b) {
    return (
      b.match_score - a.match_score ||
      (b.variation_rank || 0) - (a.variation_rank || 0) ||
      (b.video.view_count || 0) - (a.video.view_count || 0) ||
      String(b.video.published_at || '').localeCompare(String(a.video.published_at || ''))
    );
  }

  /**
   * One page's matches in rank order, with a creator's third and later videos
   * marked down by `creator_repeat` and the list ranked again.
   *
   * A page shows four videos. Three or more of them came from one channel on
   * 36% of pages, mostly a run of speedrun episodes, while another creator's
   * video a few points behind sat under the fold. The mark-down is the gap
   * between a premium and a standard channel, so it only reorders near-equals,
   * and it stops above the best video that names less of the page's variation:
   * variety must not put a generic family video over a lecture on the line.
   * It never takes a match under the threshold either.
   *
   * The score is changed, not the order alone, because the displayed order is
   * re-derived from `match_score` in SQL.
   */
  spreadCreators(openingMatches) {
    const ranked = [...openingMatches].sort((a, b) => this.compareMatches(a, b));
    const penalty = this.config.weights.creator_repeat;
    const seen = new Map();
    for (const match of ranked) {
      const creator = match.video.channel_id || match.video.channel_title;
      const above = seen.get(creator) || 0;
      seen.set(creator, above + 1);
      if (above < CREATOR_SLOTS) continue;

      const rank = match.variation_rank || 0;
      const lesser = ranked.filter((other) => (other.variation_rank || 0) < rank);
      const floor = Math.max(
        this.config.min_match_score,
        ...lesser.map((other) => other.match_score + 1)
      );
      match.match_score = Math.min(match.match_score, Math.max(match.match_score + penalty, floor));
    }
    return ranked.sort((a, b) => this.compareMatches(a, b));
  }

  /**
   * For opening names whose variation part is move notation (which can never
   * appear in a video title), return the family part for name matching.
   * "Scandinavian: 2.exd5" → "scandinavian"; "Sicilian: Najdorf" → null.
   */
  getFamilyPartName(openingName) {
    const colonIndex = openingName.indexOf(':');
    if (colonIndex === -1) return null;

    const variationPart = openingName.slice(colonIndex + 1).trim();
    if (!MOVE_NOTATION_PATTERN.test(variationPart)) return null;

    const familyPart = openingName.slice(0, colonIndex).trim();
    return familyPart.length >= 4 ? familyPart : null;
  }

  /**
   * True when a title names a distinctive sub-variation (Najdorf, Dragon,
   * Alapin, …). Such videos are not generic family overviews, so they must not
   * blanket sibling move-notation pages via the family-part fallback — we can't
   * confirm a move-notation page IS that variation, so we don't guess.
   */
  namesSpecificVariation(title, pageFamily) {
    // "Grünfeld" and "Benoni" are keywords and families both: on a page of
    // that family the word names the opening, not one of its lines
    const familyWords = pageFamily ? pageFamily.split('_') : [];
    const keywords = this.config.specific_variation_keywords || [];
    return keywords.some(
      (keyword) =>
        this.matchesTerm(title, keyword) &&
        !this.normalizeForMatch(keyword)
          .split(/[\s-]+/)
          .every((word) => familyWords.includes(word))
    );
  }

  /**
   * Parse aliases from JSON string stored in database
   */
  parseAliases(aliasesJson) {
    if (!aliasesJson || aliasesJson === '"[]"' || aliasesJson === '[]') {
      return [];
    }

    try {
      // Handle double-encoded JSON strings from database
      let parsed;
      if (
        typeof aliasesJson === 'string' &&
        aliasesJson.startsWith('"') &&
        aliasesJson.endsWith('"')
      ) {
        // Double-encoded: first parse removes outer quotes, second parse gets the object
        parsed = JSON.parse(JSON.parse(aliasesJson));
      } else {
        // Single-encoded
        parsed = JSON.parse(aliasesJson);
      }

      const aliases = [];

      if (Array.isArray(parsed)) {
        aliases.push(...parsed);
      } else if (typeof parsed === 'object') {
        // Extract values from various sources (scid, eco_wikip, ct, chessGraph, etc.)
        Object.values(parsed).forEach((value) => {
          if (typeof value === 'string' && value.trim()) {
            // Handle multiple names separated by semicolons or slashes
            const names = value
              .split(/[;\/,]/)
              .map((name) => name.trim())
              .filter((name) => name.length > 3 && name.split(/\s+/).length >= 2);
            aliases.push(...names);
          }
        });
      }

      // Remove duplicates and clean up
      return [...new Set(aliases.map((alias) => alias.trim()))];
    } catch (error) {
      console.log(`   ⚠️  Alias parsing error for: ${aliasesJson} - ${error.message}`);
      return [];
    }
  }

  /**
   * Clear existing video matches to start fresh
   */
  async clearExistingMatches() {
    console.log('🗑️  Clearing existing video matches...');

    // Get counts before deletion
    const videoCount = await new Promise((resolve, reject) => {
      this.db.db.get('SELECT COUNT(*) as count FROM videos', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const matchCount = await new Promise((resolve, reject) => {
      this.db.db.get('SELECT COUNT(*) as count FROM opening_videos', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    console.log(`   📊 Found ${videoCount} existing videos and ${matchCount} existing matches`);

    // Clear opening_videos table
    await new Promise((resolve, reject) => {
      this.db.db.run('DELETE FROM opening_videos', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Clear videos table
    await new Promise((resolve, reject) => {
      this.db.db.run('DELETE FROM videos', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('✅ Database cleared and ready for fresh matching');
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  parseDuration(duration) {
    if (!duration || typeof duration !== 'string') {
      return 0;
    }
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get common abbreviations and alternative names for openings
   */
  getOpeningAbbreviations(openingName) {
    const abbreviations = [];

    // Common chess opening abbreviations
    const abbrevMap = {
      // Queen's pawn openings
      'queens gambit': ['qgd', 'qga', 'queens pawn'],
      // NB: no 'semi-slav' here — the Semi-Slav is a different defense, not an
      // alias of the Slav (findPhrase's modifier handling relies on this too)
      'slav defense': ['slav defence', 'slav'],
      'london system': ['london', 'london opening'],
      trompowsky: ['tromp', 'trompowsky attack'],
      'catalan opening': ['catalan'],
      'grunfeld defense': ['grunfeld defence', 'grunfeld', 'grünfeld'],
      'benoni defense': ['benoni defence', 'benoni'],
      'dutch defense': ['dutch defence', 'dutch', 'leningrad dutch', 'stonewall dutch'],

      // Indian systems
      'kings indian': ['kid', 'kings indian defense', "king's indian"],
      'queens indian': ['qid', 'queens indian defense'],
      'nimzo indian': ['nimzo-indian', 'nimzo indian defense', 'nimzo'],
      'bogo indian': ['bogo-indian', 'bogo indian defense', 'bogo'],
      'kings indian attack': ['kia', "king's indian attack"],

      // King's pawn openings
      'kings gambit': ['kings pawn'],
      'french defense': ['french defence', 'french'],
      'caro kann': ['caro-kann', 'caro kann defense'],
      'sicilian defense': ['sicilian defence', 'sicilian'],
      'sicilian najdorf': ['najdorf', 'najdorf variation'],
      // NB: no 'accelerated dragon' here — the Accelerated Dragon is a
      // sibling variation of the Dragon, not an alias of it
      'sicilian dragon': ['dragon', 'dragon variation'],
      'sicilian sveshnikov': ['sveshnikov', 'sveshnikov variation'],
      'sicilian kalashnikov': ['kalashnikov'],
      'ruy lopez': ['spanish opening', 'spanish game', 'spanish'],
      'berlin defense': ['berlin', 'berlin wall', 'berlin endgame'],
      'marshall attack': ['marshall', 'marshall gambit'],
      'italian game': ['italian opening', 'italian', 'giuoco piano'],
      'scotch game': ['scotch opening', 'scotch'],
      'four knights': ['four knights game', 'four knights'],
      'petrov defense': ['petroff', 'petrov', 'russian game', 'russian defense'],
      'vienna game': ['vienna', 'vienna opening'],
      'philidor defense': ['philidor defence', 'philidor'],
      'pirc defense': ['pirc defence', 'pirc'],
      'modern defense': ['modern defence', 'modern'],
      'alekhine defense': ['alekhine defence', 'alekhines defense', 'alekhine'],
      'scandinavian defense': ['center counter', 'scandinavian'],

      // Flank openings
      'english opening': ['english'],
      'reti opening': ['reti', 'réti'],
    };

    // Check if opening name matches any known abbreviations
    for (const [fullName, abbrevs] of Object.entries(abbrevMap)) {
      if (openingName.includes(fullName)) {
        abbreviations.push(...abbrevs);
      }
    }

    // Generate automatic abbreviations for long names
    if (openingName.length > 15) {
      const words = openingName.split(/\s+/);
      if (words.length >= 3) {
        // Take first letter of each significant word
        const initials = words
          .filter(
            (word) =>
              word.length > 3 &&
              ![
                'the',
                'and',
                'of',
                'in',
                'with',
                'defense',
                'defence',
                'opening',
                'game',
                'attack',
                'variation',
              ].includes(word)
          )
          .map((word) => word[0])
          .join('');
        // 2-char initials ('sn', 'kg', …) collide with ordinary words too often
        if (initials.length >= 3) {
          abbreviations.push(initials.toLowerCase());
        }
      }
    }

    return abbreviations;
  }

  /**
   * Get ECO-based opening family from opening ECO code
   */
  getEcoBasedFamily(ecoCode) {
    return getFamilyFromEco(ecoCode);
  }

  /**
   * Detect which opening family a video title names (word-boundary matched)
   */
  getVideoConflictingFamily(title) {
    return getFamilyFromTitle(title);
  }

  /**
   * Calculate penalty for family mismatches.
   *
   * Compatibility is derived from each family's defining move prefix (see
   * opening-families.js) instead of an enumerated pair list, so shared
   * variation names ("Exchange", "Tartakower", "Steinitz") can never pull a
   * video across a 1.e4/1.d4 divide.
   *
   * @returns 0 (same family), moderate penalty (related lines), or 100 (reject)
   */
  getFamilyMismatchPenalty(videoFamily, openingEco) {
    if (!videoFamily || !openingEco) return 0;

    const openingFamily = getFamilyFromEco(openingEco);
    if (!openingFamily) return 0;

    const relation = compareFamilies(videoFamily, openingFamily);
    if (relation === 'same') return 0;
    if (relation === 'conflict') return 100;
    return Math.abs(this.config.weights.family_mismatch_moderate);
  }

  /**
   * Pre-filter videos to eliminate problematic content
   */
  preFilterVideo(video) {
    const title = video.title.toLowerCase();
    const description = (video.description || '').toLowerCase();

    // Hard exclusions from pipeline plan (refined for educational content)
    const excludeKeywords = [
      'tournament',
      'interview',
      'recap',
      'highlights',
      'live',
      'stream',
      'blitz',
      'bullet',
      'rapid',
      'fide',
      'candidates',
      ' ft. ',
      ' feat. ',
      'match',
      'round',
      'nfl',
      'beat magnus',
      'accuracy',
      'clickbait',
      // Removed 'cheat' - blocks educational "Cheater Detected" content
      // Removed 'classical' - blocks educational "Classical Variation" content
    ];

    // Fast rejection - check exclusions first (with educational exceptions)
    for (const keyword of excludeKeywords) {
      if (this.matchesTerm(title, keyword) || this.matchesTerm(description, keyword)) {
        // Exception for educational speedrun content
        if (title.includes('speedrun') || title.includes('theory') || title.includes('mastering')) {
          continue; // Allow these educational videos through
        }
        return false;
      }
    }

    // Parse duration and get view count from correct location
    const durationSeconds = this.parseDuration(video.duration);
    const viewCount = video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0;

    // Basic quality gates
    return (
      durationSeconds >= 180 && // 3+ minutes
      durationSeconds <= 7200 && // < 2 hours
      viewCount >= 500
    ); // View threshold
  }

  /**
   * Check if video title mentions a specific opening that differs from target opening.
   * E.g., title "The Wade Gambit" against opening "Latvian Gambit" → reject.
   */
  titleMentionsDifferentOpening(title, openingName) {
    const openingLower = openingName.toLowerCase();
    const openingFamily = openingLower.split(':')[0].trim();

    // Extract "[Name] Gambit/Defense/Attack" patterns from title
    const patterns = [
      /\b([\w'][\w']*(?:\s+[\w'][\w']*){0,2})\s+gambit\b/gi,
      /\b([\w'][\w']*(?:\s+[\w'][\w']*){0,2})\s+defen[sc]e\b/gi,
      /\b([\w'][\w']*(?:\s+[\w'][\w']*){0,2})\s+attack\b/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(title)) !== null) {
        const titleOpening = match[0].toLowerCase();
        if (!openingLower.includes(titleOpening) && !titleOpening.includes(openingFamily)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate weighted match score for video-opening pair
   */
  calculateMatchScore(video, opening) {
    let score = 0;
    const title = video.title.toLowerCase();
    const videoContent =
      `${video.title} ${video.description || ''} ${(video.tags || []).join(' ')}`.toLowerCase();
    const openingName = opening.name.toLowerCase();

    // 1. Strict opening name matching (much more conservative)
    const allNames = [openingName, ...opening.aliases];
    let matchType = null;
    let hasNameMatch = false;
    // Both weaker-than-title matches are held back rather than accepted on the
    // spot, and resolved after the loop: see the corroboration rule below.
    let contentOnlyName = null;
    let hasPartialTitleMatch = false;
    // "Sicilian Defense" for "Sicilian Defense: Kan Variation" — see the alias
    // skip in the loop
    const colonIndex = openingName.indexOf(':');
    const familyPrefix =
      colonIndex === -1 ? null : this.normalizeForMatch(openingName.slice(0, colonIndex)).trim();
    // The page's family from its ECO code, and the families the title names:
    // the one vocabulary that does not depend on how the page is spelt
    const pageFamily = getFamilyFromEco(opening.eco);
    const videoFamilies = this.titleFamilies(title);

    for (const name of allNames) {
      const cleanName = name.toLowerCase().trim();

      // Skip very short or generic names to avoid false matches. Bare
      // variation names shared across families ("Exchange Variation") would
      // otherwise title-match foreign openings whose move prefixes are
      // compatible (e.g. a Slav Exchange video on a QGD Exchange page).
      if (
        cleanName.length < 6 ||
        [
          'e4',
          'd4',
          'nf3',
          'nc3',
          'main line',
          'variation',
          'general',
          'opening',
          'defense',
          'defence',
          'exchange variation',
          'advance variation',
          'classical variation',
          'modern variation',
          'normal variation',
          'closed variation',
          'open variation',
          'exchange',
          'advance',
          'classical',
          'accepted',
          'declined',
        ].includes(cleanName)
      ) {
        continue;
      }

      // Skip an alias that is only this page's own family name. parseAliases
      // splits alias strings on commas, so "Sicilian Defense, O'Kelly
      // Variation" hands the Kan page a bare "Sicilian Defense" alias — which
      // title-matched every generic Sicilian video at 80 points on a specific
      // sub-variation page, above any real variation match and bypassing both
      // the intra-family guard (family matches only) and the description
      // corroboration rule (content matches only). Family-level evidence has a
      // path of its own further down; it must not enter as a name match.
      if (familyPrefix && this.normalizeForMatch(cleanName).trim() === familyPrefix) {
        continue;
      }

      // The same alias under another spelling: "King's Indian Defense" on a
      // "King's Indian: Sämisch" page is not equal to the prefix, so it slipped
      // the check above and seated every King's Indian video as a name match.
      // 95% of those pages had videos; 22% had one naming their variation.
      if (familyPrefix && cleanName !== openingName && isFamilyName(cleanName, pageFamily)) {
        continue;
      }

      // Exact match in title (highest priority). Boundary + modifier aware:
      // "accelerated dragon" never matches inside "hyperaccelerated dragon",
      // and "dragon variation" behind a foreign "accelerated" doesn't count.
      if (this.phraseMatches(title, cleanName, opening.name)) {
        hasNameMatch = true;
        matchType = 'title_exact';
        break;
      }

      // Exact match in content — recorded, not accepted yet, so a later
      // alias's title match still wins and the corroboration rule can run
      if (!contentOnlyName && this.phraseMatches(videoContent, cleanName, opening.name)) {
        contentOnlyName = cleanName;
      }

      // Partial word matching for long opening names (much more restrictive)
      if (cleanName.length > 15) {
        const words = cleanName
          .split(/\s+/)
          .filter(
            (word) =>
              word.length > 5 &&
              ![
                'defense',
                'defence',
                'opening',
                'attack',
                'gambit',
                'system',
                'variation',
                'line',
              ].includes(word)
          );
        if (words.length >= 3) {
          // Require at least 75% of significant words to be present, AND they must appear in title
          const matchedWordsInTitle = words.filter((word) =>
            this.phraseMatches(title, word, opening.name)
          );
          if (matchedWordsInTitle.length >= Math.ceil(words.length * 0.75)) {
            // Recorded, not accepted: a partial title match is worth less than
            // the content match it would otherwise pre-empt, and a later
            // alias may still match the title outright
            hasPartialTitleMatch = true;
          }
        }
      }
    }

    // VARIATION ANALYSIS — how the title relates to this page's variation.
    // Computed once and used by the corroboration rule here, the sibling guard
    // and the specificity bonus/penalty further down.
    const variationMatch = this.analyzeVariationMatch(title, opening);

    // DESCRIPTION CORROBORATION — a hit in the description or tags is weak
    // evidence on a sub-variation page. Series descriptions cross-link their
    // sibling episodes ("The theory of the Accelerated Dragon: https://…"), so
    // every Sicilian lecture in a playlist mentions every other one; taken at
    // face value that seated Alapin, Scheveningen and Prins videos on the
    // Accelerated Dragon page at 100+, above genuine Accelerated Dragon
    // lectures. The mention only counts when the title corroborates it by
    // naming the variation too; otherwise the video is judged as if the
    // description hit had not happened and must earn its place through the
    // partial-title or family paths, where the intra-family guard polices it.
    //
    // "Is this a variation page" is the colon in the name, NOT whether
    // `analyzeVariationMatch` found segments: a page whose variation is one
    // short word ("Sicilian Defense: Kan Variation" — 'kan' is below the
    // 3-char floor) yields no segments at all, and treating that as a
    // family-level page let the very cross-links this rule exists to stop
    // straight back onto those pages.
    const isVariationPage = openingName.includes(':');
    if (!hasNameMatch && contentOnlyName && (!isVariationPage || variationMatch.anyCleanWord)) {
      hasNameMatch = true;
      matchType = 'exact';
    }

    // A partial title match is the weaker of the two deferred signals (45 vs
    // 60), so it only applies once the content match has had its chance
    if (!hasNameMatch && hasPartialTitleMatch) {
      hasNameMatch = true;
      matchType = 'partial_title';
    }

    // Check opening family using simplified ECO-based approach
    if (!hasNameMatch) {
      // Simple family matching for major openings only
      const simpleFamilies = {
        'ruy lopez': ['spanish', 'ruy lopez'],
        sicilian: ['sicilian'],
        'queens gambit': ['queens gambit', 'qgd', 'qga'],
        french: ['french'],
        'caro kann': ['caro-kann', 'caro kann'],
        'nimzo indian': ['nimzo-indian', 'nimzo indian'],
        'kings indian': ['kings indian', "king's indian"],
        english: ['english opening'],
      };

      for (const [openingKey, familyTerms] of Object.entries(simpleFamilies)) {
        if (openingName.includes(openingKey)) {
          for (const familyTerm of familyTerms) {
            if (this.phraseMatches(title, familyTerm, opening.name)) {
              hasNameMatch = true;
              matchType = 'family';
              break;
            }
          }
          if (hasNameMatch) break;
        }
      }
    }

    // The title names the page's family. The list above only fires when the
    // page name contains its key verbatim, which "King's Indian", "Caro-Kann"
    // and "Nimzo-Indian" never do (apostrophe, hyphen) and "QGD", "QGA" and
    // "Gruenfeld" cannot: "QGD: …" pages were 5% covered beside "Sicilian: …"
    // at 99%. On the family's own root page the family IS the name.
    if (!hasNameMatch && pageFamily && videoFamilies.includes(pageFamily)) {
      hasNameMatch = true;
      matchType = isFamilyName(openingName, pageFamily) ? 'title_exact' : 'family';
    }

    // Check common abbreviations (only for well-known openings, only in title)
    if (!hasNameMatch) {
      const abbreviations = this.getOpeningAbbreviations(openingName);
      for (const abbrev of abbreviations) {
        if (this.phraseMatches(title, abbrev, opening.name)) {
          hasNameMatch = true;
          matchType = 'abbreviation';
          break;
        }
      }
    }

    // Openings named with move notation ("Scandinavian: 2.exd5") can never
    // appear verbatim in a title — match on the family part instead
    if (!hasNameMatch) {
      const familyPart = this.getFamilyPartName(openingName);
      if (familyPart && this.phraseMatches(title, familyPart, opening.name)) {
        hasNameMatch = true;
        matchType = 'family';
      }
    }

    // ECO code matching - only if it's in title AND accompanied by other opening terms
    if (!hasNameMatch && opening.eco && title.includes(opening.eco.toLowerCase())) {
      const hasOpeningContext = ['opening', 'repertoire', 'theory', 'explained', 'guide'].some(
        (word) => title.includes(word)
      );
      if (hasOpeningContext) {
        hasNameMatch = true;
        matchType = 'eco';
      }
    }

    if (!hasNameMatch) {
      return 0; // No opening reference found
    }

    // SIBLING-MODIFIER GUARD — the title's only mentions of this page's
    // variation words sit behind a foreign modifier ("The Accelerated Dragon"
    // on the plain Dragon page, "Hyperaccelerated Dragon" on the Accelerated
    // Dragon page). That affirmatively names a DIFFERENT opening, so reject
    // regardless of how the name match was found.
    if (variationMatch.siblingOnly) {
      return 0;
    }

    // INTRA-FAMILY VARIATION GUARD — prevent sibling-variation blanketing.
    // A family-level match only proves the video and page share an opening
    // family (both Sicilian), not the same variation. A specific-variation
    // video (Dragon, Najdorf, Alapin, …) is only valid on a sub-variation page
    // if it actually names THAT page's variation; otherwise it's a sibling
    // (a Dragon lecture on a Najdorf page) and is rejected. On move-notation
    // pages the variation can't be read from the name at all, so only generic
    // family overviews are kept. This stops one Sicilian Dragon video
    // blanketing every Sicilian page, which the cross-family guard (e4 vs d4)
    // can't catch and the -40 specificity penalty is too weak to prevent once
    // premium/educational bonuses are added.
    if (
      matchType === 'family' &&
      openingName.includes(':') &&
      this.namesSpecificVariation(title, pageFamily) &&
      !variationMatch.anyCleanWord
    ) {
      return 0;
    }

    // FAMILY-BASED NEGATIVE MATCHING - Prevent cross-family contamination.
    // A title may name several openings (speedruns, comparison videos), so a
    // video is only rejected when EVERY family it names conflicts with the
    // page; otherwise the most compatible one decides the penalty.
    if (videoFamilies.length > 0) {
      const familyMismatchPenalty = Math.min(
        ...videoFamilies.map((family) => this.getFamilyMismatchPenalty(family, opening.eco))
      );
      if (familyMismatchPenalty >= 100) {
        return 0; // Complete rejection for severe mismatches
      }
      // Apply family mismatch penalty AFTER initial scoring to ensure it's not overridden
      score -= familyMismatchPenalty;
    }

    const weights = this.config.weights;

    // Much more conservative scoring
    if (matchType === 'title_exact') score += weights.title_exact;
    else if (matchType === 'exact') score += weights.content_exact;
    else if (matchType === 'family')
      score += weights.family; // Good for family matches
    else if (matchType === 'partial_title') score += weights.partial_title;
    else if (matchType === 'abbreviation') score += weights.abbreviation;
    else if (matchType === 'eco') score += weights.eco;

    // Reject content-only matches where title clearly names a DIFFERENT opening
    if (matchType === 'exact') {
      if (this.titleMentionsDifferentOpening(title, openingName)) {
        return 0;
      }
    }

    // Variation specificity: on a sub-variation page, a video that names the
    // variation must outrank a generic family video, so the bonus/penalty gap
    // is deliberately larger than the channel/educational bonuses. The bonus
    // requires a FULL segment of the variation name ("Accelerated Dragon"
    // needs both words) — partial word overlap ("Dragon" alone) is generic
    // coverage and takes the miss penalty instead. Short variation names
    // (Lolli, Sozin — no >5-char words) apply no swing at all, so generic
    // family videos keep covering those niche pages.
    if (variationMatch.hasBonusWords) {
      if (variationMatch.segmentMatched) {
        score += weights.variation_specific;
      } else {
        score += weights.sub_variation_miss;
      }
    }

    // 2. Penalize generic game analysis (major penalty) - EXPANDED
    const gameAnalysisTerms = [
      'brilliant',
      'amazing',
      'incredible',
      'insane',
      'crazy',
      'epic',
      'beats',
      'wins',
      'loses',
      'sacrifices',
      'mates in',
      '||',
      'recap',
      'highlights',
      'match',
      'round',
      'tournament',
      'world championship',
      'candidates',
      'fide',
      'grand prix',
      'crushes',
      'destroys',
      'annihilates',
      'blunders',
      'genius',
      'masterpiece',
      'immortal game',
      'subscriber',
      'times!!!',
      'joins the party',
      'when the',
      'what a',
      'unbelievable',
    ];
    if (gameAnalysisTerms.some((term) => this.matchesTerm(title, term))) {
      score += weights.game_analysis;
    }

    // 3. Player-vs-player pattern penalty (targeted replacement for generic 'vs')
    const rawTitle = video.title || '';
    const playerVsPattern = /\b[A-Z][a-z]+\s+vs\.?\s+[A-Z][a-z]+/;
    if (playerVsPattern.test(rawTitle)) {
      score += weights.player_vs_player;
    }

    // 4. Penalize movie/documentary content
    const movieTerms = ['movie', 'film', 'documentary', 'biopic', 'story of'];
    if (movieTerms.some((term) => this.matchesTerm(title, term))) {
      score += weights.movie;
    }

    // 5. Channel quality from config/youtube_channels.json quality_tier
    const channelTier = this.getChannelTier(video);
    if (channelTier === 'premium') {
      score += weights.premium_channel;
    } else if (channelTier === 'standard') {
      score += weights.standard_channel;
    } else if (channelTier === 'entertainment') {
      score += weights.entertainment_channel;
    }

    // 6. Duration requirements (favor substantial educational content)
    if (video.duration >= 1200 && video.duration <= 3600) {
      // 20-60 minutes ideal for detailed instruction
      score += weights.duration_ideal;
    } else if (video.duration >= 600 && video.duration <= 1200) {
      // 10-20 minutes still good
      score += weights.duration_good;
    } else if (video.duration < 300) {
      // Very short videos likely not instructional
      score += weights.duration_short;
    }

    // 7. Enhanced Educational Content Recognition (PRIORITY: Capture Naroditsky-style content)
    const strongEducationalTerms = [
      'explained',
      'theory',
      'fundamentals',
      'guide',
      'tutorial',
      'lesson',
      'masterclass',
      'repertoire',
      'how to',
      'mastering',
      'understanding',
      'principles',
      'concepts',
      // How introductions are titled: "Learn the Caro-Kann Defense" (6.7M
      // views) took the non-educational penalty and never reached a page
      'learn',
      'introduction',
      'beginner',
      'basics',
      'crash course',
    ];

    const speedrunEducationalTerms = [
      'speedrun',
      'theory speedrun',
      'educational speedrun',
      'unrated to rated',
      'sensei speedrun',
      'climbing ladder',
      'road to',
    ];

    const hasStrongEducational =
      strongEducationalTerms.some((term) => title.includes(term)) || TIMED_PRIMER.test(title);
    const hasSpeedrunEducational = speedrunEducationalTerms.some((term) => title.includes(term));
    const isPremiumEducator = channelTier === 'premium';

    if (hasStrongEducational) {
      score += weights.educational;
    } else if (hasSpeedrunEducational && isPremiumEducator) {
      score += weights.speedrun_premium;
    } else if (hasSpeedrunEducational) {
      score += weights.speedrun;
    } else if (!hasStrongEducational && !hasSpeedrunEducational) {
      if (isPremiumEducator) {
        score += weights.no_educational_premium;
      } else {
        score += weights.no_educational;
      }
    }

    // 8. Proven audience, for videos that qualified without it
    if (score >= this.config.min_match_score) {
      score += this.popularityBonus(video.view_count);
    }

    return Math.max(0, Math.round(score)); // Ensure non-negative scores
  }

  /**
   * Run matching with provided video candidates (new pipeline order)
   */
  async runMatchingWithVideos(candidateVideos, options = {}) {
    console.log('🚀 Starting FEN-based Video Matching with provided candidates...');
    console.log(`📹 Processing ${candidateVideos.length} pre-filtered candidates`);

    // Clear existing matches first (default to true for backward compatibility)
    if (options.clearDb !== false) {
      await this.clearExistingMatches();
    }

    // Get all openings from database
    console.log('🔍 Loading openings from database...');
    const openings = await new Promise((resolve, reject) => {
      this.db.db.all('SELECT id, name, eco, aliases FROM openings', (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON aliases for each opening
          const parsedOpenings = rows.map((opening) => ({
            ...opening,
            aliases: this.parseAliases(opening.aliases),
            family: getFamilyFromEco(opening.eco),
          }));
          resolve(parsedOpenings);
        }
      });
    });
    console.log(`📚 Found ${openings.length} openings to match against`);

    // Match videos to openings (with smart pre-filtering)
    console.log('🎯 Matching videos to specific openings...');
    const matches = [];
    let processedVideos = 0;
    let totalChecks = 0;
    let actualMatches = 0;

    for (const video of candidateVideos) {
      processedVideos++;
      if (processedVideos % 100 === 0) {
        console.log(
          `   Processed ${processedVideos}/${candidateVideos.length} videos... (${actualMatches} matches found)`
        );
      }

      // Convert video format for matching
      const videoForMatching = {
        id: video.id,
        title: video.title,
        description: video.description,
        channel_title: video.channelTitle,
        duration:
          typeof video.duration === 'number' ? video.duration : this.parseDuration(video.duration),
        view_count: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0,
        published_at: video.publishedAt,
        thumbnail_url: video.thumbnails?.default?.url,
        tags: video.tags || [],
      };

      // Diacritic-normalized so the loose pre-filter stays a superset of the
      // scorer's normalized matching ("Maróczy" page vs "maroczy" title)
      const videoContent = this.normalizeForMatch(
        `${video.title} ${video.description || ''} ${(video.tags || []).join(' ')}`
      );

      // Smart pre-filtering: only check openings that might match (more restrictive)
      const lowerTitle = video.title.toLowerCase();
      const titleFamilies = this.titleFamilies(lowerTitle);

      const candidateOpenings = openings.filter((opening) => {
        const allNames = [opening.name, ...opening.aliases];

        // The title names the page's family (mirrors the scorer's family path)
        if (opening.family && titleFamilies.includes(opening.family)) {
          return true;
        }

        // Move-notation names match on their family part (mirrors the scorer):
        // only generic family videos, never specific-variation ones
        const familyPart = this.getFamilyPartName(opening.name.toLowerCase());
        if (
          familyPart &&
          videoContent.includes(this.normalizeForMatch(familyPart)) &&
          !this.namesSpecificVariation(video.title.toLowerCase(), opening.family)
        ) {
          return true;
        }

        // Check for any potential match (stricter than before)
        return allNames.some((name) => {
          const cleanName = this.normalizeForMatch(name).trim();

          // Skip very short names or generic terms
          if (
            cleanName.length < 5 ||
            ['opening', 'defense', 'defence', 'attack', 'system', 'general'].includes(cleanName)
          ) {
            return false;
          }

          // Quick exact match check
          if (videoContent.includes(cleanName)) return true;

          // For longer names, require more substantial word overlap
          if (cleanName.length > 15) {
            const words = cleanName
              .split(/\s+/)
              .filter(
                (word) =>
                  word.length > 4 &&
                  ![
                    'defense',
                    'defence',
                    'opening',
                    'attack',
                    'gambit',
                    'system',
                    'variation',
                  ].includes(word)
              );
            if (words.length >= 2) {
              const matchedWords = words.filter((word) => videoContent.includes(word));
              // Require at least 50% word match for pre-filtering
              if (matchedWords.length >= Math.ceil(words.length * 0.5)) {
                return true;
              }
            }
          }

          // ECO code check (only for exact matches)
          if (opening.eco && videoContent.includes(opening.eco.toLowerCase())) {
            return true;
          }

          return false;
        });
      });

      totalChecks += candidateOpenings.length;

      // Only score openings that passed pre-filter
      for (const opening of candidateOpenings) {
        const score = this.calculateMatchScore(videoForMatching, opening);
        // Apply minimum score threshold to filter out weak matches
        if (score >= this.config.min_match_score) {
          // Require substantial evidence
          matches.push({
            opening_id: opening.id,
            video_id: video.id,
            match_score: score,
            variation_rank: this.variationEvidenceRank(video.title, opening),
            named_variations: this.namedVariationSegments(lowerTitle, opening),
            video: videoForMatching,
          });
          actualMatches++;
        }
      }
    }

    console.log(`🎯 Created ${matches.length} video-opening matches`);
    console.log(
      `   📊 Efficiency: ${totalChecks} opening checks (avg ${(totalChecks / candidateVideos.length).toFixed(1)} per video vs ${openings.length} without pre-filter)`
    );

    // Overview or variation video, and what that costs on a root page
    const levelledMatches = this.applyVideoLevels(
      matches,
      new Map(openings.map((opening) => [opening.id, opening]))
    );

    // Select top videos per opening
    console.log('🔝 Selecting top videos per opening...');
    const openingGroups = {};
    levelledMatches.forEach((match) => {
      if (!openingGroups[match.opening_id]) {
        openingGroups[match.opening_id] = [];
      }
      openingGroups[match.opening_id].push(match);
    });

    console.log(`   📊 Openings with matches: ${Object.keys(openingGroups).length}`);

    const finalMatches = [];
    const uniqueVideos = new Set();

    Object.entries(openingGroups).forEach(([openingId, openingMatches]) => {
      const topMatches = this.spreadCreators(openingMatches).slice(0, 10);

      console.log(
        `   📝 Opening ${openingId}: ${openingMatches.length} matches → selected top ${topMatches.length}`
      );

      topMatches.forEach((match) => {
        finalMatches.push(match);
        uniqueVideos.add(match.video_id);
      });
    });

    console.log(
      `✅ Final selection: ${finalMatches.length} matches, ${uniqueVideos.size} unique videos`
    );

    // Save results to database
    console.log('💾 Saving results to database...');

    // Channel ids by video id — a linear scan per match was ~440M string
    // comparisons once rematch started scoring the whole enrichment corpus
    const channelIdsByVideo = new Map(candidateVideos.map((v) => [v.id, v.channelId || '']));

    // Insert videos — description/tags are persisted so rematch mode can
    // re-score with the same evidence the original run had
    for (const match of finalMatches) {
      const video = match.video;
      await new Promise((resolve, reject) => {
        this.db.db.run(
          `
          INSERT OR REPLACE INTO videos (
            id, title, channel_id, channel_title, duration,
            view_count, published_at, thumbnail_url, description, tags, level, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
          [
            video.id,
            video.title,
            channelIdsByVideo.get(video.id) || '',
            video.channel_title,
            video.duration,
            video.view_count,
            video.published_at,
            video.thumbnail_url,
            video.description || '',
            JSON.stringify(video.tags || []),
            video.level,
          ],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log(`   🔗 Creating ${finalMatches.length} video-opening relationships...`);

    // Insert relationships
    for (const match of finalMatches) {
      await new Promise((resolve, reject) => {
        this.db.db.run(
          `
          INSERT OR REPLACE INTO opening_videos (
            opening_id, video_id, match_score, variation_rank, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `,
          [match.opening_id, match.video_id, match.match_score, match.variation_rank || 0],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('✅ Database save complete!');

    return {
      totalVideos: candidateVideos.length,
      candidateVideos: candidateVideos.length,
      totalMatches: matches.length,
      finalMatches: finalMatches.length,
      uniqueVideos: uniqueVideos.size,
      openingsWithVideos: Object.keys(openingGroups).length,
      matchedCount: uniqueVideos.size,
      openingsCount: Object.keys(openingGroups).length,
      matches: finalMatches,
    };
  }
}

module.exports = VideoMatcher;

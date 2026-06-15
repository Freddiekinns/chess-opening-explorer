const fs = require('fs');
const path = require('path');
const DatabaseSchema = require('../database/schema-manager.js');
const {
  getFamilyFromEco,
  getFamilyFromTitle,
  getFamiliesFromTitle,
  compareFamilies,
} = require('./opening-families');

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
  },
  entertainment_channels: ['chess24', 'world chess', 'fide chess'],
};

/**
 * Detects move notation in opening names, e.g. "Scandinavian: 2.exd5",
 * "Caro-Kann: 2.Nf3", "Scandinavian: 2...Qxd5 3.Nc3".
 */
const MOVE_NOTATION_PATTERN = /\d+\.(?:\.\.)?\s*[a-zA-Z]/;

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
    const resolvedPath = configPath || path.join(CONFIG_DIR, 'youtube_channels.json');
    const tiers = { byId: new Map(), byName: [] };
    try {
      const channelsConfig = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      for (const channel of channelsConfig.trusted_channels || []) {
        const tier = channel.quality_tier === 'premium' ? 'premium' : 'standard';
        if (channel.channel_id) tiers.byId.set(channel.channel_id, tier);
        // Strip parenthetical suffixes: "ChessExplained (Christof Sielecki)"
        const name = channel.name
          .replace(/\s*\(.*\)\s*$/, '')
          .trim()
          .toLowerCase();
        if (name) tiers.byName.push({ name, tier });
      }
    } catch (error) {
      // No channels config — every channel scores as unknown
    }
    return tiers;
  }

  /**
   * Classify a video's channel: 'premium' | 'standard' | 'entertainment' | null
   */
  getChannelTier(video) {
    const channelId = video.channel_id || video.channelId;
    if (channelId && this.channelTiers.byId.has(channelId)) {
      return this.channelTiers.byId.get(channelId);
    }

    const channelTitle = (video.channel_title || video.channelTitle || '').toLowerCase();
    if (!channelTitle) return null;

    for (const { name, tier } of this.channelTiers.byName) {
      if (channelTitle.includes(name)) return tier;
    }

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
      'slav defense': ['slav defence', 'slav', 'semi-slav', 'semi slav'],
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
      'sicilian dragon': ['dragon', 'dragon variation', 'accelerated dragon'],
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

      // Exact match in title (highest priority)
      if (title.includes(cleanName)) {
        hasNameMatch = true;
        matchType = 'title_exact';
        break;
      }

      // Exact match in content (still good)
      if (videoContent.includes(cleanName)) {
        hasNameMatch = true;
        matchType = 'exact';
        break;
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
          const matchedWordsInTitle = words.filter((word) => title.includes(word));
          if (matchedWordsInTitle.length >= Math.ceil(words.length * 0.75)) {
            hasNameMatch = true;
            matchType = 'partial_title';
            break;
          }
        }
      }
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
            if (title.includes(familyTerm)) {
              hasNameMatch = true;
              matchType = 'family';
              break;
            }
          }
          if (hasNameMatch) break;
        }
      }
    }

    // Check common abbreviations (only for well-known openings, only in title)
    if (!hasNameMatch) {
      const abbreviations = this.getOpeningAbbreviations(openingName);
      for (const abbrev of abbreviations) {
        if (this.matchesTerm(title, abbrev)) {
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
      if (familyPart && this.matchesTerm(title, familyPart)) {
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

    // FAMILY-BASED NEGATIVE MATCHING - Prevent cross-family contamination.
    // A title may name several openings (speedruns, comparison videos), so a
    // video is only rejected when EVERY family it names conflicts with the
    // page; otherwise the most compatible one decides the penalty.
    const videoFamilies = getFamiliesFromTitle(title);

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
    // is deliberately larger than the channel/educational bonuses.
    if (openingName.includes(':')) {
      const variationPart = openingName.split(':').slice(1).join(':').toLowerCase().trim();
      const variationWords = variationPart.split(/[\s,]+/).filter(
        (w) =>
          w.length > 5 &&
          !/\d/.test(w) && // move notation ("2.exd5") never appears in titles
          !['variation', 'defense', 'defence', 'attack', 'gambit', 'system', 'line'].includes(w)
      );
      if (variationWords.length > 0) {
        if (variationWords.some((w) => title.includes(w))) {
          score += weights.variation_specific;
        } else {
          score += weights.sub_variation_miss;
        }
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

    const hasStrongEducational = strongEducationalTerms.some((term) => title.includes(term));
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

      const videoContent =
        `${video.title} ${video.description || ''} ${(video.tags || []).join(' ')}`.toLowerCase();

      // Smart pre-filtering: only check openings that might match (more restrictive)
      const candidateOpenings = openings.filter((opening) => {
        const allNames = [opening.name, ...opening.aliases];

        // Move-notation names match on their family part (mirrors the scorer)
        const familyPart = this.getFamilyPartName(opening.name.toLowerCase());
        if (familyPart && videoContent.includes(familyPart)) {
          return true;
        }

        // Check for any potential match (stricter than before)
        return allNames.some((name) => {
          const cleanName = name.toLowerCase().trim();

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

    // Select top videos per opening
    console.log('🔝 Selecting top videos per opening...');
    const openingGroups = {};
    matches.forEach((match) => {
      if (!openingGroups[match.opening_id]) {
        openingGroups[match.opening_id] = [];
      }
      openingGroups[match.opening_id].push(match);
    });

    console.log(`   📊 Openings with matches: ${Object.keys(openingGroups).length}`);

    const finalMatches = [];
    const uniqueVideos = new Set();

    Object.entries(openingGroups).forEach(([openingId, openingMatches]) => {
      // Sort by score, breaking ties by proven popularity then recency so the
      // displayed order is never arbitrary
      const topMatches = openingMatches
        .sort(
          (a, b) =>
            b.match_score - a.match_score ||
            (b.video.view_count || 0) - (a.video.view_count || 0) ||
            String(b.video.published_at || '').localeCompare(String(a.video.published_at || ''))
        )
        .slice(0, 10);

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

    // Insert videos — description/tags are persisted so rematch mode can
    // re-score with the same evidence the original run had
    for (const match of finalMatches) {
      const video = match.video;
      await new Promise((resolve, reject) => {
        this.db.db.run(
          `
          INSERT OR REPLACE INTO videos (
            id, title, channel_id, channel_title, duration,
            view_count, published_at, thumbnail_url, description, tags, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
          [
            video.id,
            video.title,
            candidateVideos.find((v) => v.id === video.id)?.channelId || '',
            video.channel_title,
            video.duration,
            video.view_count,
            video.published_at,
            video.thumbnail_url,
            video.description || '',
            JSON.stringify(video.tags || []),
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
            opening_id, video_id, match_score, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `,
          [match.opening_id, match.video_id, match.match_score],
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

  /**
   * Run complete re-matching with new system
   */
  async runNewMatching() {
    console.log('🚀 Starting FEN-based Video Re-Matching...');

    // Clear existing matches first
    await this.clearExistingMatches();

    // Load video data
    console.log('📁 Loading video data...');
    const videoDataPath = path.join(__dirname, '../../data/video_enrichment_cache.json');
    const videoData = JSON.parse(fs.readFileSync(videoDataPath, 'utf8'));
    const videoKeys = Object.keys(videoData).filter(
      (key) => !['lastUpdated', 'version', 'entries'].includes(key)
    );

    // Pre-filter videos
    console.log('🚫 Pre-filtering problematic content...');
    const filteredVideos = [];
    let filteredCount = 0;

    for (const key of videoKeys) {
      const video = videoData[key];
      if (this.preFilterVideo(video)) {
        filteredVideos.push({
          id: video.id,
          title: video.title,
          description: video.description,
          channel_title: video.channelTitle,
          duration: video.duration,
          view_count: video.viewCount,
          published_at: video.publishedAt,
          thumbnail_url: video.thumbnails?.default?.url,
          tags: video.tags || [],
        });
      } else {
        filteredCount++;
      }
    }

    console.log(
      `✅ Filtered ${filteredCount} problematic videos, ${filteredVideos.length} candidates remaining`
    );

    // Get all openings from database
    console.log('🔍 Loading openings from database...');
    const openings = await new Promise((resolve, reject) => {
      this.db.db.all('SELECT id, name, eco, aliases FROM openings', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    console.log(`📚 Found ${openings.length} openings to match against`);

    // Match videos to openings
    console.log('🎯 Matching videos to specific openings...');
    const matches = [];
    let processedVideos = 0;

    for (const video of filteredVideos) {
      processedVideos++;
      if (processedVideos % 100 === 0) {
        console.log(`   Processed ${processedVideos}/${filteredVideos.length} videos...`);
      }

      for (const opening of openings) {
        const score = this.calculateMatchScore(video, opening);
        if (score > 0) {
          matches.push({
            opening_id: opening.id,
            video_id: video.id,
            match_score: score,
            video: video,
          });
        }
      }
    }

    console.log(`🎯 Created ${matches.length} video-opening matches`);

    // Select top videos per opening
    console.log('🔝 Selecting top videos per opening...');
    const openingGroups = {};
    matches.forEach((match) => {
      if (!openingGroups[match.opening_id]) {
        openingGroups[match.opening_id] = [];
      }
      openingGroups[match.opening_id].push(match);
    });

    const finalMatches = [];
    const uniqueVideos = new Set();

    Object.entries(openingGroups).forEach(([openingId, openingMatches]) => {
      // Sort by score and take top 10
      const topMatches = openingMatches.sort((a, b) => b.match_score - a.match_score).slice(0, 10);

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

    // First, collect all unique videos to insert
    const videosToInsert = new Map();
    const enrichmentData = JSON.parse(fs.readFileSync('data/video_enrichment_cache.json', 'utf8'));

    finalMatches.forEach((match) => {
      if (!videosToInsert.has(match.video_id)) {
        const video = enrichmentData[match.video_id];
        if (video) {
          // Parse duration from ISO 8601 format
          const durationMatch = video.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          const hours = parseInt(durationMatch?.[1] || '0');
          const minutes = parseInt(durationMatch?.[2] || '0');
          const seconds = parseInt(durationMatch?.[3] || '0');
          const durationSeconds = hours * 3600 + minutes * 60 + seconds;

          videosToInsert.set(match.video_id, {
            id: video.id,
            title: video.title,
            channel_id: video.channelId,
            channel_title: video.channelTitle,
            duration: durationSeconds,
            view_count: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0,
            published_at: video.publishedAt,
            thumbnail_url: video.thumbnails?.default?.url,
            description: video.description || '',
            tags: JSON.stringify(video.tags || []),
          });
        }
      }
    });

    console.log(`   📹 Inserting ${videosToInsert.size} unique videos...`);

    // Insert videos
    for (const [videoId, videoData] of videosToInsert) {
      await new Promise((resolve, reject) => {
        this.db.db.run(
          `
          INSERT OR REPLACE INTO videos (
            id, title, channel_id, channel_title, duration,
            view_count, published_at, thumbnail_url, description, tags, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
          [
            videoData.id,
            videoData.title,
            videoData.channel_id,
            videoData.channel_title,
            videoData.duration,
            videoData.view_count,
            videoData.published_at,
            videoData.thumbnail_url,
            videoData.description,
            videoData.tags,
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
            opening_id, video_id, match_score, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `,
          [match.opening_id, match.video_id, match.match_score],
          function (err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    console.log('✅ Database save complete!');

    return {
      totalVideos: videoKeys.length,
      filteredOut: filteredCount,
      candidateVideos: filteredVideos.length,
      totalMatches: matches.length,
      finalMatches: finalMatches.length,
      uniqueVideos: uniqueVideos.size,
      openingsWithVideos: Object.keys(openingGroups).length,
      matches: finalMatches,
    };
  }
}

module.exports = VideoMatcher;

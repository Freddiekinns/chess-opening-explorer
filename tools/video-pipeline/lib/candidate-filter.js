/**
 * Pre-Filter Video Candidates
 * Phase 1 of Pipeline Overhaul - Quality Issues Fix
 *
 * Eliminates 80% of irrelevant videos before expensive API calls
 * using intelligent title-based filtering and quality gates.
 *
 * Performance Target: Filter 1000 videos in <100ms
 * Reduction Target: 70-80% of typical YouTube discovery results
 */

class PreFilterVideos {
  constructor() {
    // Exclusion patterns for different types of unwanted content.
    // All alternatives are word-boundary anchored: without \b, 'fun' rejected
    // "Fundamentals", 'live' rejected "delivers" and 'round' rejected
    // "background" — silently dropping prime educational content at discovery.
    this.exclusionPatterns = {
      // Tournament and live content
      tournaments: /\b(?:live|stream|tournament|championship|match|round)\b|\bgame\s+\d+/i,

      // Non-chess sports and entertainment
      sports: /\b(?:nfl|nba|soccer|football|baseball|basketball|hockey|tennis|golf|mma|ufc)\b/i,

      // Non-educational content types ('fun' removed — it matched
      // "fundamentals", which is a strong educational marker)
      casual: /\b(?:blitz|bullet|casual|random)\b|\bjust\s+playing\b/i,

      // Reaction and commentary content
      reactions: /\b(?:react|reaction|reacting|commentary|responds?|watching)\b/i,

      // Highlights and result-focused content
      highlights:
        /\bwins?\s+in\s+\d+\s+moves?\b|\bloses?\s+in\s+\d+\s+moves?\b|\bmatch\s+highlights\b/i,

      // Podcasts and interviews
      podcasts: /\b(?:podcast|interview|talks?|discussion|chat)\b/i,

      // Non-chess content
      nonChess:
        /\b(?:cooking|music|travel|news|politics|crypto|bitcoin|stock|movie|review|unboxing)\b/i,
    };

    // Titles with explicit teaching markers bypass the 'casual' exclusion so
    // content like "Blitz Opening Repertoire" or a Naroditsky theory speedrun
    // isn't dropped just for naming a fast time control.
    this.casualExemptionPattern =
      /\b(?:repertoire|explained|theory|guide|tutorial|lesson|masterclass|fundamentals|speedrun|how\s+to)\b/i;

    // Positive patterns for educational content
    this.educationalPatterns = {
      openings: /(?:opening|defense|attack|gambit|variation|system|setup)/i,
      tactics: /(?:tactic|puzzle|mate|checkmate|pin|fork|skewer|combination)/i,
      endgames: /(?:endgame|ending|pawn|rook|queen|king|opposition)/i,
      analysis:
        /(?:analysis|annotated|explained|masterclass|lesson|guide|tutorial|repertoire|theory)/i,
      strategy: /(?:strategy|plan|structure|weakness|strength|positional)/i,
    };

    // Duration thresholds (in seconds)
    this.durationThresholds = {
      premium: 240, // 4 minutes for premium channels
      standard: 480, // 8 minutes for standard channels
    };
  }

  /**
   * Pre-filters a single video candidate
   * @param {Object} video - Video object with title, duration, qualityTier
   * @returns {boolean} - Whether video passes pre-filter
   */
  preFilterVideo(video) {
    if (!video || !video.title) {
      return false;
    }

    const title = video.title.trim();
    if (!title) {
      return false;
    }

    // Check for exclusion patterns
    for (const [category, pattern] of Object.entries(this.exclusionPatterns)) {
      if (category === 'casual' && this.casualExemptionPattern.test(title)) {
        continue;
      }
      if (pattern.test(title)) {
        return false;
      }
    }

    // Check duration requirements (if duration is provided)
    if (video.duration && !this.meetsDurationRequirements(video)) {
      return false;
    }

    // Apply channel-specific quality gates
    if (!this.meetsChannelQualityGates(video)) {
      return false;
    }

    // Must match at least one educational pattern
    return this.hasEducationalContent(title);
  }

  /**
   * Checks if video meets duration requirements based on channel tier
   * @param {Object} video - Video with duration and qualityTier
   * @returns {boolean} - Whether duration is acceptable
   */
  meetsDurationRequirements(video) {
    const durationSeconds = this.parseDuration(video.duration);
    if (durationSeconds === null) {
      return true; // Allow if duration can't be parsed
    }

    const threshold =
      this.durationThresholds[video.qualityTier] || this.durationThresholds.standard;
    return durationSeconds >= threshold;
  }

  /**
   * Parses ISO 8601 duration string to seconds
   * @param {string} duration - ISO 8601 duration (e.g., "PT15M30S")
   * @returns {number|null} - Duration in seconds or null if invalid
   */
  parseDuration(duration) {
    if (!duration || typeof duration !== 'string') {
      return null;
    }

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return null;
    }

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Applies channel-specific quality gates
   * @param {Object} video - Video with qualityTier and title
   * @returns {boolean} - Whether video meets channel standards
   */
  meetsChannelQualityGates(video) {
    const qualityTier = video.qualityTier || 'standard';

    if (qualityTier === 'standard') {
      // Stricter filtering for standard channels
      const casualPattern = /\b(?:casual|random|quick|short)\b|\bjust\s+playing\b/i;
      if (casualPattern.test(video.title)) {
        return false;
      }
    }

    // Premium channels get more lenient treatment
    return true;
  }

  /**
   * Checks if title contains educational chess content
   * @param {string} title - Video title
   * @returns {boolean} - Whether title indicates educational content
   */
  hasEducationalContent(title) {
    for (const pattern of Object.values(this.educationalPatterns)) {
      if (pattern.test(title)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Filters array of video candidates
   * @param {Array} videos - Array of video objects
   * @returns {Object} - Results with candidates and statistics
   */
  filterCandidates(videos) {
    if (!Array.isArray(videos) || videos.length === 0) {
      return {
        candidates: [],
        totalInput: 0,
        totalCandidates: 0,
        rejectedCount: 0,
        reductionPercentage: 0,
      };
    }

    const candidates = videos.filter((video) => this.preFilterVideo(video));
    const rejectedCount = videos.length - candidates.length;
    const reductionPercentage =
      videos.length > 0 ? Math.round((rejectedCount / videos.length) * 100) : 0;

    return {
      candidates,
      totalInput: videos.length,
      totalCandidates: candidates.length,
      rejectedCount,
      reductionPercentage,
    };
  }
}

module.exports = PreFilterVideos;

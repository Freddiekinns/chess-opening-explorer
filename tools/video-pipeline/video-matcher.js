const fs = require('fs');
const path = require('path');
const DatabaseSchema = require('../database/schema-manager.js');

/**
 * New FEN-based Video Matching System
 * Implements the pipeline overhaul plan with weighted scoring
 */
class VideoMatcher {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = new DatabaseSchema(dbPath);
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
      if (typeof aliasesJson === 'string' && aliasesJson.startsWith('"') && aliasesJson.endsWith('"')) {
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
        Object.values(parsed).forEach(value => {
          if (typeof value === 'string' && value.trim()) {
            // Handle multiple names separated by semicolons or slashes
            const names = value.split(/[;\/,]/).map(name => name.trim()).filter(name => name.length > 3);
            aliases.push(...names);
          }
        });
      }
      
      // Remove duplicates and clean up
      return [...new Set(aliases.map(alias => alias.trim()))];
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
      'queens gambit': ['qgd', 'qga', 'queens pawn'],
      'kings gambit': ['kings pawn'],
      'english opening': ['english'],
      'french defense': ['french defence', 'french'],
      'caro kann': ['caro-kann', 'caro kann defense'],
      'kings indian': ['kid', 'kings indian defense'],
      'queens indian': ['qid', 'queens indian defense'],
      'nimzo indian': ['nimzo-indian', 'nimzo indian defense'],
      'ruy lopez': ['spanish opening', 'spanish game'],
      'italian game': ['italian opening'],
      'scotch game': ['scotch opening'],
      'sicilian defense': ['sicilian defence', 'sicilian'],
      'pirc defense': ['pirc defence', 'pirc'],
      'alekhine defense': ['alekhine defence', 'alekhines defense'],
      'scandinavian defense': ['center counter', 'scandinavian'],
      'benoni defense': ['benoni defence', 'benoni'],
      'catalan opening': ['catalan'],
      'grunfeld defense': ['grunfeld defence', 'grunfeld'],
      'bogo indian': ['bogo-indian', 'bogo indian defense']
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
          .filter(word => word.length > 3 && !['the', 'and', 'of', 'in', 'with', 'defense', 'defence', 'opening', 'game', 'attack', 'variation'].includes(word))
          .map(word => word[0])
          .join('');
        if (initials.length >= 2) {
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
    if (!ecoCode || ecoCode.length < 3) return null;
    
    const code = ecoCode.toUpperCase();
    const firstChar = code[0];
    const numPart = parseInt(code.substring(1, 3));
    
    // ECO family mappings based on standard chess opening classification
    const ecoFamilies = {
      // A00-A39: Irregular and flank openings
      'A00-A09': 'irregular',
      'A10-A39': 'english',
      'A40-A44': 'queens_pawn',
      'A45-A49': 'indian_systems',
      'A50-A79': 'indian_defenses',
      'A80-A99': 'dutch',
      
      // B00-B99: Semi-open games (1.e4 without 1...e5)
      'B00-B09': 'kings_pawn_misc',
      'B10-B19': 'caro_kann',
      'B20-B99': 'sicilian',
      
      // C00-C99: Open games (1.e4 e5) and French
      'C00-C19': 'french',
      'C20-C29': 'kings_pawn_games',
      'C30-C39': 'kings_gambit',
      'C40-C49': 'kings_pawn_misc',
      'C50-C59': 'italian',
      'C60-C99': 'spanish', // Ruy Lopez
      
      // D00-D99: Closed games (1.d4 d5)
      'D00-D05': 'queens_pawn_misc',
      'D06-D69': 'queens_gambit',
      'D70-D99': 'grunfeld_neo_grunfeld',
      
      // E00-E99: Indian defenses
      'E00-E09': 'catalan',
      'E10-E19': 'queens_indian',
      'E20-E59': 'nimzo_indian',
      'E60-E99': 'kings_indian'
    };
    
    // Find matching range
    for (const [range, family] of Object.entries(ecoFamilies)) {
      const [start, end] = range.split('-');
      const startNum = parseInt(start.substring(1));
      const endNum = parseInt(end.substring(1));
      const startChar = start[0];
      
      if (firstChar === startChar && numPart >= startNum && numPart <= endNum) {
        return family;
      }
    }
    
    return null;
  }

  /**
   * Detect major conflicting families in video title (simplified)
   */
  getVideoConflictingFamily(title) {
    const lowerTitle = title.toLowerCase();
    
    // Only detect the most problematic mismatches - focus on major conflicts
    const conflictDetectors = {
      'nimzo_indian': ['nimzo-indian', 'nimzo indian'],
      'queens_gambit': ['queen\'s gambit', 'queens gambit', 'qgd', 'qga'],
      'sicilian': ['sicilian defense', 'sicilian defence', 'sicilian'],
      'french': ['french defense', 'french defence', 'french'],
      'spanish': ['ruy lopez', 'spanish game', 'spanish opening'],
      'kings_indian': ['king\'s indian', 'kings indian', 'kid'],
      'caro_kann': ['caro-kann', 'caro kann'],
      'italian': ['italian game', 'italian opening'],
      'english': ['english opening', 'english'],
      'dutch': ['dutch defense', 'dutch defence']
    };
    
    for (const [family, detectors] of Object.entries(conflictDetectors)) {
      if (detectors.some(detector => lowerTitle.includes(detector))) {
        return family;
      }
    }
    
    return null;
  }

  /**
   * Calculate penalty for family mismatches using ECO-based detection
   */
  getFamilyMismatchPenalty(videoFamily, openingEco) {
    if (!videoFamily || !openingEco) return 0;
    
    const openingFamily = this.getEcoBasedFamily(openingEco);
    if (!openingFamily) return 0;
    
    // Normalize family names for comparison
    const normalizeFamily = (family) => {
      const familyMap = {
        'queens_gambit': 'queens_gambit',
        'queens gambit': 'queens_gambit',
        'queens_pawn_misc': 'queens_gambit', // Group similar D00 openings
        'nimzo_indian': 'nimzo_indian',
        'nimzo indian': 'nimzo_indian',
        'kings_indian': 'kings_indian',
        'kings indian': 'kings_indian',
        'caro_kann': 'caro_kann',
        'caro kann': 'caro_kann'
      };
      return familyMap[family] || family;
    };
    
    const normalizedVideoFamily = normalizeFamily(videoFamily);
    const normalizedOpeningFamily = normalizeFamily(openingFamily);
    
    if (normalizedVideoFamily === normalizedOpeningFamily) {
      return 0; // Perfect match
    }
    
    // Define severe incompatibilities (block completely)
    const severeIncompatibilities = [
      ['nimzo_indian', 'queens_gambit'],
      ['nimzo_indian', 'sicilian'],
      ['nimzo_indian', 'french'],
      ['queens_gambit', 'sicilian'],
      ['queens_gambit', 'french'],
      ['queens_gambit', 'kings_indian'],
      ['sicilian', 'french'],
      ['sicilian', 'spanish'], // Ruy Lopez
      ['french', 'spanish'],
      ['caro_kann', 'sicilian'],
      ['caro_kann', 'french']
    ];
    
    // Check for severe incompatibility
    for (const [family1, family2] of severeIncompatibilities) {
      if ((normalizedVideoFamily === family1 && normalizedOpeningFamily === family2) ||
          (normalizedVideoFamily === family2 && normalizedOpeningFamily === family1)) {
        return 100; // Complete rejection
      }
    }
    
    // Moderate penalty for other mismatches
    return 30;
  }

  /**
   * Pre-filter videos to eliminate problematic content
   */
  preFilterVideo(video) {
    const title = video.title.toLowerCase();
    const description = (video.description || '').toLowerCase();
    
    // Hard exclusions from pipeline plan (refined for educational content)
    const excludeKeywords = [
      'tournament', 'interview', 'recap', 'highlights', 'live', 'stream',
      'blitz', 'bullet', 'rapid', 'fide', 'candidates',
      ' ft. ', ' feat. ', 'match', 'round', 'nfl',
      'beat magnus', 'accuracy', 'clickbait'
      // Removed 'cheat' - blocks educational "Cheater Detected" content
      // Removed 'classical' - blocks educational "Classical Variation" content
    ];
    
    // Fast rejection - check exclusions first (with educational exceptions)
    for (const keyword of excludeKeywords) {
      if (title.includes(keyword) || description.includes(keyword)) {
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
    return durationSeconds >= 180 && // 3+ minutes
           durationSeconds <= 7200 && // < 2 hours  
           viewCount >= 500; // View threshold
  }

  /**
   * Calculate weighted match score for video-opening pair
   */
  calculateMatchScore(video, opening) {
    let score = 0;
    const title = video.title.toLowerCase();
    const videoContent = `${video.title} ${video.description || ''} ${(video.tags || []).join(' ')}`.toLowerCase();
    const openingName = opening.name.toLowerCase();

    // 1. Strict opening name matching (much more conservative)
    const allNames = [openingName, ...opening.aliases];
    let matchType = null;
    let hasNameMatch = false;
    
    for (const name of allNames) {
      const cleanName = name.toLowerCase().trim();
      
      // Skip very short or generic names to avoid false matches
      if (cleanName.length < 6 || ['e4', 'd4', 'nf3', 'nc3', 'main line', 'variation', 'general', 'opening', 'defense', 'defence'].includes(cleanName)) {
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
        const words = cleanName.split(/\s+/).filter(word => 
          word.length > 5 && 
          !['defense', 'defence', 'opening', 'attack', 'gambit', 'system', 'variation', 'line'].includes(word)
        );
        if (words.length >= 3) {
          // Require at least 75% of significant words to be present, AND they must appear in title
          const matchedWordsInTitle = words.filter(word => title.includes(word));
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
        'sicilian': ['sicilian'],
        'queens gambit': ['queens gambit', 'qgd', 'qga'],
        'french': ['french'],
        'caro kann': ['caro-kann', 'caro kann'],
        'nimzo indian': ['nimzo-indian', 'nimzo indian'],
        'kings indian': ['kings indian', 'king\'s indian'],
        'english': ['english opening']
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
        if (title.includes(abbrev)) {
          hasNameMatch = true;
          matchType = 'abbreviation';
          break;
        }
      }
    }
    
    // ECO code matching - only if it's in title AND accompanied by other opening terms
    if (!hasNameMatch && opening.eco && title.includes(opening.eco.toLowerCase())) {
      const hasOpeningContext = ['opening', 'repertoire', 'theory', 'explained', 'guide'].some(word => title.includes(word));
      if (hasOpeningContext) {
        hasNameMatch = true;
        matchType = 'eco';
      }
    }
    
    if (!hasNameMatch) {
      return 0; // No opening reference found
    }
    
    // FAMILY-BASED NEGATIVE MATCHING - Prevent cross-family contamination
    const videoConflictingFamily = this.getVideoConflictingFamily(title);
    
    if (videoConflictingFamily) {
      const familyMismatchPenalty = this.getFamilyMismatchPenalty(videoConflictingFamily, opening.eco);
      if (familyMismatchPenalty >= 100) {
        return 0; // Complete rejection for severe mismatches
      }
      // Apply family mismatch penalty AFTER initial scoring to ensure it's not overridden
      score -= familyMismatchPenalty;
    }
    
    // Much more conservative scoring
    if (matchType === 'title_exact') score += 80;
    else if (matchType === 'exact') score += 60;
    else if (matchType === 'family') score += 50; // Good for family matches
    else if (matchType === 'partial_title') score += 45;
    else if (matchType === 'abbreviation') score += 35;
    else if (matchType === 'eco') score += 20;

    // 2. Strong educational content requirement (only specific terms)
    const strongEducationalKeywords = ['explained', 'theory', 'fundamentals', 'guide', 'tutorial', 'lesson', 'masterclass', 'repertoire', 'how to'];
    if (strongEducationalKeywords.some(word => title.includes(word))) {
      score += 25; // Increased bonus for educational content
    }
    
    // 3. Penalize generic game analysis (major penalty) - EXPANDED
    const gameAnalysisTerms = [
      'brilliant', 'amazing', 'incredible', 'insane', 'crazy', 'epic', 
      'vs', 'beats', 'wins', 'loses', 'sacrifices', 'mates in',
      '||', 'recap', 'highlights', 'match', 'round', 'tournament',
      'world championship', 'candidates', 'fide', 'grand prix',
      'crushes', 'destroys', 'annihilates', 'blunders', 'genius',
      'masterpiece', 'immortal game', 'subscriber', 'times!!!',
      'joins the party', 'when the', 'what a', 'unbelievable'
    ];
    if (gameAnalysisTerms.some(term => title.includes(term))) {
      score -= 60; // Even heavier penalty for game analysis
    }
    
    // 4. Specific agadmator penalty (since he's primarily game analysis)
    if ((video.channel_title || '').toLowerCase().includes('agadmator')) {
      score -= 50; // Much stronger penalty for agadmator since it's mostly game analysis
    }
    
    // 5. Penalize movie/documentary content
    const movieTerms = ['movie', 'film', 'documentary', 'biopic', 'story of'];
    if (movieTerms.some(term => title.includes(term))) {
      score -= 50;
    }
    
    // 6. Enhanced Channel Quality System (PRIORITY: Maximize good creators)
    const premiumEducators = [
      'daniel naroditsky', 'naroditsky', 'hanging pawns', 'saint louis chess club',
      'chess.com', 'chessnetwork', 'gingergm', 'eric rosen', 'chess network',
      'john bartholomew', 'christof sielecki', 'chess24', 'chess club and scholastic center'
    ];
    
    const goodEducators = [
      'gothamchess', 'chess.com', 'chessexplained', 'powerplaychess',
      'remote chess academy', 'thechesswebsite', 'chess.com', 'iichess'
    ];
    
    const entertainmentChannels = [
      'agadmator', 'chess24', 'world chess', 'fide chess'
    ];
    
    const channelTitle = (video.channel_title || '').toLowerCase();
    
    if (premiumEducators.some(channel => channelTitle.includes(channel))) {
      score += 40; // Major bonus for premium educators
    } else if (goodEducators.some(channel => channelTitle.includes(channel))) {
      score += 20; // Good bonus for solid educators
    } else if (entertainmentChannels.some(channel => channelTitle.includes(channel))) {
      score -= 30; // Penalty for entertainment-focused channels
    }
    
    // 7. Duration requirements (favor substantial educational content)
    if (video.duration >= 1200 && video.duration <= 3600) { // 20-60 minutes ideal for detailed instruction
      score += 15;
    } else if (video.duration >= 600 && video.duration <= 1200) { // 10-20 minutes still good
      score += 10;
    } else if (video.duration < 300) { // Very short videos likely not instructional
      score -= 25;
    }

    // 8. Enhanced Educational Content Recognition (PRIORITY: Capture Naroditsky-style content)
    const strongEducationalTerms = [
      'explained', 'theory', 'fundamentals', 'guide', 'tutorial', 'lesson', 'masterclass',
      'repertoire', 'how to', 'mastering', 'understanding', 'principles', 'concepts'
    ];
    
    const speedrunEducationalTerms = [
      'speedrun', 'theory speedrun', 'educational speedrun', 'unrated to rated',
      'sensei speedrun', 'climbing ladder', 'road to'
    ];
    
    const hasStrongEducational = strongEducationalTerms.some(term => title.includes(term));
    const hasSpeedrunEducational = speedrunEducationalTerms.some(term => title.includes(term));
    const isPremiumEducator = premiumEducators.some(channel => channelTitle.includes(channel));
    
    if (hasStrongEducational) {
      score += 30; // Strong bonus for explicit educational content
    } else if (hasSpeedrunEducational && isPremiumEducator) {
      score += 25; // Special bonus for premium educator speedruns
    } else if (hasSpeedrunEducational) {
      score += 15; // Moderate bonus for other speedruns
    } else if (!hasStrongEducational && !hasSpeedrunEducational) {
      if (isPremiumEducator) {
        score -= 5; // Small penalty for premium educators without clear educational markers
      } else {
        score -= 25; // Larger penalty for other channels without educational content
      }
    }

    return Math.max(0, Math.round(score)); // Ensure non-negative scores
  }

  /**
   * Run matching with provided video candidates (new pipeline order)
   */
  async runMatchingWithVideos(candidateVideos) {
    console.log('🚀 Starting FEN-based Video Matching with provided candidates...');
    console.log(`📹 Processing ${candidateVideos.length} pre-filtered candidates`);
    
    // Clear existing matches first
    await this.clearExistingMatches();
    
    // Get all openings from database
    console.log('🔍 Loading openings from database...');
    const openings = await new Promise((resolve, reject) => {
      this.db.db.all('SELECT id, name, eco, aliases FROM openings', (err, rows) => {
        if (err) reject(err);
        else {
          // Parse JSON aliases for each opening
          const parsedOpenings = rows.map(opening => ({
            ...opening,
            aliases: this.parseAliases(opening.aliases)
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
        console.log(`   Processed ${processedVideos}/${candidateVideos.length} videos... (${actualMatches} matches found)`);
      }
      
      // Convert video format for matching
      const videoForMatching = {
        id: video.id,
        title: video.title,
        description: video.description,
        channel_title: video.channelTitle,
        duration: this.parseDuration(video.duration),
        view_count: video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : 0,
        published_at: video.publishedAt,
        thumbnail_url: video.thumbnails?.default?.url,
        tags: video.tags || []
      };
      
      const videoContent = `${video.title} ${video.description || ''} ${(video.tags || []).join(' ')}`.toLowerCase();
      
      // Smart pre-filtering: only check openings that might match (more restrictive)
      const candidateOpenings = openings.filter(opening => {
        const allNames = [opening.name, ...opening.aliases];
        
        // Check for any potential match (stricter than before)
        return allNames.some(name => {
          const cleanName = name.toLowerCase().trim();
          
          // Skip very short names or generic terms
          if (cleanName.length < 5 || ['opening', 'defense', 'defence', 'attack', 'system', 'general'].includes(cleanName)) {
            return false;
          }
          
          // Quick exact match check
          if (videoContent.includes(cleanName)) return true;
          
          // For longer names, require more substantial word overlap
          if (cleanName.length > 15) {
            const words = cleanName.split(/\s+/).filter(word => 
              word.length > 4 && 
              !['defense', 'defence', 'opening', 'attack', 'gambit', 'system', 'variation'].includes(word)
            );
            if (words.length >= 2) {
              const matchedWords = words.filter(word => videoContent.includes(word));
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
        if (score >= 60) { // Require substantial evidence
          matches.push({
            opening_id: opening.id,
            video_id: video.id,
            match_score: score,
            video: videoForMatching
          });
          actualMatches++;
        }
      }
    }
    
    console.log(`🎯 Created ${matches.length} video-opening matches`);
    console.log(`   📊 Efficiency: ${totalChecks} opening checks (avg ${(totalChecks/candidateVideos.length).toFixed(1)} per video vs ${openings.length} without pre-filter)`);
    
    // Select top videos per opening
    console.log('🔝 Selecting top videos per opening...');
    const openingGroups = {};
    matches.forEach(match => {
      if (!openingGroups[match.opening_id]) {
        openingGroups[match.opening_id] = [];
      }
      openingGroups[match.opening_id].push(match);
    });
    
    console.log(`   📊 Openings with matches: ${Object.keys(openingGroups).length}`);
    
    const finalMatches = [];
    const uniqueVideos = new Set();
    
    Object.entries(openingGroups).forEach(([openingId, openingMatches]) => {
      // Sort by score and take top 10
      const topMatches = openingMatches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10);
      
      console.log(`   📝 Opening ${openingId}: ${openingMatches.length} matches → selected top ${topMatches.length}`);
      
      topMatches.forEach(match => {
        finalMatches.push(match);
        uniqueVideos.add(match.video_id);
      });
    });
    
    console.log(`✅ Final selection: ${finalMatches.length} matches, ${uniqueVideos.size} unique videos`);
    
    // Save results to database
    console.log('💾 Saving results to database...');
    
    // Insert videos
    for (const match of finalMatches) {
      const video = match.video;
      await new Promise((resolve, reject) => {
        this.db.db.run(`
          INSERT OR REPLACE INTO videos (
            id, title, channel_id, channel_title, duration, 
            view_count, published_at, thumbnail_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          video.id,
          video.title,
          candidateVideos.find(v => v.id === video.id)?.channelId || '',
          video.channel_title,
          video.duration,
          video.view_count,
          video.published_at,
          video.thumbnail_url
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    console.log(`   🔗 Creating ${finalMatches.length} video-opening relationships...`);
    
    // Insert relationships
    for (const match of finalMatches) {
      await new Promise((resolve, reject) => {
        this.db.db.run(`
          INSERT OR REPLACE INTO opening_videos (
            opening_id, video_id, match_score, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `, [
          match.opening_id,
          match.video_id,
          match.match_score
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
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
      matches: finalMatches
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
    const videoKeys = Object.keys(videoData).filter(key => !['lastUpdated', 'version', 'entries'].includes(key));
    
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
          tags: video.tags || []
        });
      } else {
        filteredCount++;
      }
    }
    
    console.log(`✅ Filtered ${filteredCount} problematic videos, ${filteredVideos.length} candidates remaining`);
    
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
            video: video
          });
        }
      }
    }
    
    console.log(`🎯 Created ${matches.length} video-opening matches`);
    
    // Select top videos per opening
    console.log('🔝 Selecting top videos per opening...');
    const openingGroups = {};
    matches.forEach(match => {
      if (!openingGroups[match.opening_id]) {
        openingGroups[match.opening_id] = [];
      }
      openingGroups[match.opening_id].push(match);
    });
    
    const finalMatches = [];
    const uniqueVideos = new Set();
    
    Object.entries(openingGroups).forEach(([openingId, openingMatches]) => {
      // Sort by score and take top 10
      const topMatches = openingMatches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 10);
      
      topMatches.forEach(match => {
        finalMatches.push(match);
        uniqueVideos.add(match.video_id);
      });
    });
    
    console.log(`✅ Final selection: ${finalMatches.length} matches, ${uniqueVideos.size} unique videos`);
    
    // Save results to database
    console.log('💾 Saving results to database...');
    
    // First, collect all unique videos to insert
    const videosToInsert = new Map();
    const enrichmentData = JSON.parse(fs.readFileSync('data/video_enrichment_cache.json', 'utf8'));
    
    finalMatches.forEach(match => {
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
            thumbnail_url: video.thumbnails?.default?.url
          });
        }
      }
    });
    
    console.log(`   📹 Inserting ${videosToInsert.size} unique videos...`);
    
    // Insert videos
    for (const [videoId, videoData] of videosToInsert) {
      await new Promise((resolve, reject) => {
        this.db.db.run(`
          INSERT OR REPLACE INTO videos (
            id, title, channel_id, channel_title, duration, 
            view_count, published_at, thumbnail_url, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          videoData.id,
          videoData.title,
          videoData.channel_id,
          videoData.channel_title,
          videoData.duration,
          videoData.view_count,
          videoData.published_at,
          videoData.thumbnail_url
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    console.log(`   🔗 Creating ${finalMatches.length} video-opening relationships...`);
    
    // Insert relationships
    for (const match of finalMatches) {
      await new Promise((resolve, reject) => {
        this.db.db.run(`
          INSERT OR REPLACE INTO opening_videos (
            opening_id, video_id, match_score, created_at
          ) VALUES (?, ?, ?, datetime('now'))
        `, [
          match.opening_id,
          match.video_id,
          match.match_score
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
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
      matches: finalMatches
    };
  }
}

module.exports = VideoMatcher;

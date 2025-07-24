const fs = require('fs').promises;
const path = require('path');

/**
 * Channel-First Indexer: Revolutionary approach to chess opening video discovery
 * 
 * Instead of searching for videos (expensive API calls), we:
 * 1. Build a comprehensive local index of all videos from trusted channels
 * 2. Match openings to videos using intelligent pattern matching
 * 3. Enrich matched videos with detailed metadata
 * 
 * This solves the "Impossible Triangle" of Search Quality + API Quota + Coverage
 */
class ChannelFirstIndexer {
  constructor(options = {}) {
    this.youtubeService = options.youtubeService;
    this.databaseService = options.databaseService;
    this.config = options.config || {};
    this.fileSystem = options.fileSystem || require('fs').promises; // Add file system support
    this.localIndex = new Map(); // channelId -> videos[]
    this.openingPatterns = new Map(); // opening -> patterns[]
    this.enrichedVideos = new Map(); // videoId -> enriched data
  }

  /**
   * Phase 1: Build comprehensive local index from trusted channels
   */
  async buildLocalIndex(channelIds = []) {
    const results = {
      totalVideos: 0,
      channelsCovered: 0,
      errors: []
    };

    try {
      for (const channelId of channelIds) {
        try {
          // Handle both string and object channel IDs
          const actualChannelId = typeof channelId === 'string' ? channelId : channelId.channel_id;
          
          console.log(`🔍 Indexing channel: ${actualChannelId}`);
          
          // Get ALL videos from channel for comprehensive coverage
          // No arbitrary limits - we only enrich videos that match openings
          // Get ALL videos with complete historical coverage
          const videos = await this.youtubeService.getChannelPlaylistItems(actualChannelId, {
            maxResults: 'all', // Get ALL videos, not just 200
            order: 'date', // Chronological order for better historical coverage
            publishedAfter: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000).toISOString() // 15 years ago
          });

          // NEW: Fetch enhanced video details with statistics and metadata
          console.log(`  🔢 Fetching enhanced details for ${videos.length} videos...`);
          const videoIds = videos.map(v => v.id);
          const videosWithDetails = await this.youtubeService.batchFetchVideoDetails(videoIds);

          // Merge enhanced details back into videos
          const enhancedVideos = videos.map(video => {
            const details = videosWithDetails.find(v => v.id === video.id);
            return {
              ...video,
              // Add statistics and enhanced metadata
              statistics: details?.statistics || { viewCount: "0", likeCount: "0", commentCount: "0" },
              tags: details?.tags || [],
              categoryId: details?.categoryId,
              defaultLanguage: details?.defaultLanguage,
              contentDetails: details?.contentDetails,
              status: details?.status,
              topicDetails: details?.topicDetails,
              // Keep original data as fallback
              duration: details?.duration || video.duration,
              // Add enhanced metadata flag
              hasEnhancedMetadata: !!details
            };
          });

          this.localIndex.set(actualChannelId, enhancedVideos);
          results.totalVideos += enhancedVideos.length;
          results.channelsCovered++;
          
          console.log(`  ✅ ${enhancedVideos.length} videos indexed with enhanced metadata`);
          const enhancedCount = enhancedVideos.filter(v => v.hasEnhancedMetadata).length;
          console.log(`  📊 ${enhancedCount}/${enhancedVideos.length} videos have complete metadata`);
        } catch (error) {
          console.log(`  ❌ Failed: ${error.message}`);
          results.errors.push({
            channelId,
            error: error.message
          });
        }
      }

      // If there were errors and no successful channels, check for specific errors
      if (results.errors.length > 0 && results.channelsCovered === 0) {
        const firstError = results.errors[0].error;
        if (firstError.includes('rate limit') || firstError.includes('API rate limit exceeded')) {
          throw new Error('API rate limit exceeded');
        }
        // If it's just a general API error, don't throw - return the results
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to build local index: ${error.message}`);
    }
  }

  /**
   * Phase 2: Match openings to videos using intelligent pattern matching
   */
  async matchOpeningsToVideos(openings = []) {
    const matches = [];
    const totalOpenings = openings.length;
    const startTime = Date.now();
    let lastReportTime = startTime;
    const reportInterval = 2000; // Report every 2 seconds

    console.log(`🔍 Starting to match ${totalOpenings} openings to videos...`);

    for (let i = 0; i < openings.length; i++) {
      const opening = openings[i];
      const patterns = this._generateSearchPatterns(opening);
      const matchedVideos = [];

      // Search through local index
      for (const [channelId, videos] of this.localIndex) {
        const channelMatches = videos.filter(video => 
          this._matchesAnyPattern(video, patterns)
        );
        matchedVideos.push(...channelMatches);
      }

      // Score and rank matches
      const scoredMatches = matchedVideos.map(video => ({
        ...video,
        matchScore: this._calculateMatchScore(video, opening, patterns)
      }));

      // Sort by score and take top matches
      scoredMatches.sort((a, b) => b.matchScore - a.matchScore);
      
      if (scoredMatches.length > 0) {
        matches.push({
          opening,
          videos: scoredMatches.slice(0, 10)
        });
      }

      // Progress reporting
      const now = Date.now();
      if (now - lastReportTime > reportInterval) {
        const processed = i + 1;
        const percentage = ((processed / totalOpenings) * 100).toFixed(1);
        const elapsed = now - startTime;
        const rate = processed / (elapsed / 1000); // items per second
        const estimatedTotal = (elapsed / processed) * totalOpenings;
        const remaining = estimatedTotal - elapsed;
        
        console.log(`🎯 Progress: ${processed}/${totalOpenings} (${percentage}%) | Rate: ${rate.toFixed(1)}/sec | ETA: ${Math.round(remaining/1000)}s | Matches: ${matches.length}`);
        lastReportTime = now;
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Matching complete: ${matches.length} matched openings in ${(totalTime/1000).toFixed(1)}s`);
    
    return matches;
  }

  /**
   * Phase 3: Enrich matched videos with detailed metadata
   * Features: Progress tracking, caching, resumability, deduplication-optimized
   */
  async enrichWithVideoDetails(videosInput, options = {}) {
    const {
      cacheFile = 'data/enrichment_cache.json',
      progressCallback = null,
      batchSize = 50
    } = options;

    // Load existing cache
    const cache = await this._loadEnrichmentCache(cacheFile);
    const enrichedResults = [];
    let totalProcessed = 0;
    let totalVideos = 0;

    // Handle both array input (for deduplicated videos) and match groups
    const isDeduplicatedInput = Array.isArray(videosInput) && videosInput.length > 0 && !videosInput[0].opening;
    
    if (isDeduplicatedInput) {
      // New optimized path: process deduplicated unique videos
      totalVideos = videosInput.length;
      console.log(`🎬 Starting video enrichment: ${totalVideos} unique videos to process`);
      
      // Separate cached vs uncached videos
      const uncachedVideos = [];
      const cachedVideos = [];

      for (const video of videosInput) {
        if (cache[video.id] && this._isCacheValid(cache[video.id])) {
          cachedVideos.push({
            video,
            enriched: cache[video.id]
          });
        } else {
          uncachedVideos.push(video);
        }
      }

      console.log(`  📊 Cache status: ${cachedVideos.length} cached, ${uncachedVideos.length} need enrichment`);

      // Process cached videos (instant)
      for (const { video, enriched } of cachedVideos) {
        enrichedResults.push(enriched);
        this.enrichedVideos.set(video.id, enriched);
        totalProcessed++;

        // Report progress
        if (progressCallback) {
          progressCallback({
            processed: totalProcessed,
            total: totalVideos,
            current: video.title,
            fromCache: true,
            percentage: Math.round((totalProcessed / totalVideos) * 100)
          });
        }
      }

      // Process uncached videos in batches
      if (uncachedVideos.length > 0) {
        console.log(`  🔄 Processing ${uncachedVideos.length} uncached videos...`);
        
        try {
          for (let i = 0; i < uncachedVideos.length; i += batchSize) {
            const batch = uncachedVideos.slice(i, i + batchSize);
            console.log(`  🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uncachedVideos.length/batchSize)} (${batch.length} videos)`);

            // Enrich each video in the batch using existing data only (no API calls)
            for (let j = 0; j < batch.length; j++) {
              const video = batch[j];
              
              // Create enriched video using existing rich metadata
              const enrichedVideo = {
                id: video.id,
                title: video.title,
                description: video.description,
                publishedAt: video.publishedAt,
                channelId: video.channelId,
                channelTitle: video.channelTitle,
                thumbnails: video.thumbnails,
                
                // Enhanced metadata from detailed API calls
                tags: video.tags || [],
                categoryId: video.categoryId,
                defaultLanguage: video.defaultLanguage,
                duration: video.duration,
                
                // Generate YouTube URL
                url: `https://www.youtube.com/watch?v=${video.id}`,
                
                // Enhanced analysis using rich metadata
                analysis: {
                  relevanceScore: video.matchScore || 0,
                  difficultyLevel: this._analyzeDifficultyFromMetadata(video),
                  contentType: this._analyzeContentTypeFromMetadata(video),
                  instructorQuality: this._analyzeChannelQuality(video.channelId),
                  videoQuality: this._analyzeVideoQuality(video),
                  engagementMetrics: this._calculateEngagementMetrics(video),
                  educationalValue: this._assessEducationalValue(video)
                },
                
                // Complete statistics
                statistics: video.statistics || { viewCount: "0", likeCount: "0", commentCount: "0" },
                
                // Technical details
                contentDetails: video.contentDetails,
                status: video.status,
                topicDetails: video.topicDetails,
                
                metadata: {
                  indexedAt: new Date().toISOString(),
                  source: 'channel-first-indexer',
                  version: '2.0.0',
                  hasEnhancedMetadata: video.hasEnhancedMetadata || false,
                  cached: false
                }
              };
              
              enrichedResults.push(enrichedVideo);
              this.enrichedVideos.set(video.id, enrichedVideo);
              
              // Update cache
              cache[video.id] = enrichedVideo;
              
              totalProcessed++;

              // Report progress
              if (progressCallback) {
                progressCallback({
                  processed: totalProcessed,
                  total: totalVideos,
                  current: video.title,
                  fromCache: false,
                  percentage: Math.round((totalProcessed / totalVideos) * 100)
                });
              }
            }

            // Save cache after each batch (for resumability)
            await this._saveEnrichmentCache(cacheFile, cache);
            console.log(`  💾 Cache updated (${Object.keys(cache).length} videos cached)`);

            // Small delay between batches to respect rate limits
            if (i + batchSize < uncachedVideos.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (error) {
          // Save cache even on error for partial progress
          await this._saveEnrichmentCache(cacheFile, cache);
          
          console.warn(`Failed to enrich videos:`, error.message);
          // Continue with original videos in case of error - don't break the loop
          for (const video of uncachedVideos) {
            enrichedResults.push(video);
          }
        }
      }

      // Final cache save
      await this._saveEnrichmentCache(cacheFile, cache);
      console.log(`✅ Enrichment complete: ${totalProcessed} videos processed (${cachedVideos.length} from cache, ${uncachedVideos.length} newly enriched)`);

      return enrichedResults;
      
    } else {
      // Legacy path: process match groups (for backward compatibility)
      return this._enrichWithVideoDetailsLegacy(videosInput, options);
    }
  }

  /**
   * Legacy enrichment method for backward compatibility
   */
  async _enrichWithVideoDetailsLegacy(matchedVideos, options = {}) {
    const {
      cacheFile = 'data/enrichment_cache.json',
      progressCallback = null,
      batchSize = 50
    } = options;

    // Load existing cache
    const cache = await this._loadEnrichmentCache(cacheFile);
    const enrichedResults = [];
    let totalProcessed = 0;
    let totalVideos = 0;

    // Handle both array and Map input
    const videoArray = Array.isArray(matchedVideos) ? matchedVideos : Array.from(matchedVideos.values());

    // Count total videos for progress tracking
    for (const matchGroup of videoArray) {
      const videos = matchGroup.videos || matchGroup;
      totalVideos += videos.length;
    }

    console.log(`🎬 Starting video enrichment: ${totalVideos} videos to process`);

    for (const matchGroup of videoArray) {
      const enrichedVideos = [];
      const videos = matchGroup.videos || matchGroup;
      
      if (videos.length > 0) {
        // Separate cached vs uncached videos
        const uncachedVideos = [];
        const cachedVideos = [];

        for (const video of videos) {
          if (cache[video.id] && this._isCacheValid(cache[video.id])) {
            cachedVideos.push({
              video,
              enriched: cache[video.id]
            });
          } else {
            uncachedVideos.push(video);
          }
        }

        console.log(`  📊 Cache status: ${cachedVideos.length} cached, ${uncachedVideos.length} need enrichment`);

        // Process cached videos (instant)
        for (const { video, enriched } of cachedVideos) {
          enrichedVideos.push(enriched);
          this.enrichedVideos.set(video.id, enriched);
          totalProcessed++;

          // Report progress
          if (progressCallback) {
            progressCallback({
              processed: totalProcessed,
              total: totalVideos,
              current: video.title,
              fromCache: true,
              percentage: Math.round((totalProcessed / totalVideos) * 100)
            });
          }
        }

        // Process uncached videos in batches
        if (uncachedVideos.length > 0) {
          try {
            for (let i = 0; i < uncachedVideos.length; i += batchSize) {
              const batch = uncachedVideos.slice(i, i + batchSize);
              console.log(`  🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uncachedVideos.length/batchSize)} (${batch.length} videos)`);

              // NO EXPENSIVE API CALLS! Use existing playlist data
              // We already have title, description, publishedAt, thumbnails from getChannelPlaylistItems
              
              // Enrich each video in the batch using existing data only
              for (let j = 0; j < batch.length; j++) {
                const video = batch[j];
                
                // Create enriched video using existing data (no API calls!)
                const enrichedVideo = {
                  id: video.id,
                  title: video.title,
                  description: video.description,
                  publishedAt: video.publishedAt,
                  channelId: video.channelId,
                  channelTitle: video.channelTitle,
                  thumbnails: video.thumbnails,
                  
                  // Generate YouTube URL - this is all we really need!
                  url: `https://www.youtube.com/watch?v=${video.id}`,
                  
                  // Analysis based on existing data (no API calls)
                  analysis: {
                    relevanceScore: video.matchScore || 0,
                    difficultyLevel: this._analyzeDifficultyFromTitle(video.title),
                    contentType: this._analyzeContentTypeFromTitle(video.title),
                    instructorQuality: this._analyzeChannelQuality(video.channelId)
                  },
                  metadata: {
                    indexedAt: new Date().toISOString(),
                    source: 'channel-first-indexer',
                    version: '1.0.0',
                    cached: false
                  }
                };
                
                enrichedVideos.push(enrichedVideo);
                this.enrichedVideos.set(video.id, enrichedVideo);
                
                // Update cache
                cache[video.id] = enrichedVideo;
                
                totalProcessed++;

                // Report progress
                if (progressCallback) {
                  progressCallback({
                    processed: totalProcessed,
                    total: totalVideos,
                    current: video.title,
                    fromCache: false,
                    percentage: Math.round((totalProcessed / totalVideos) * 100)
                  });
                }
              }

              // Save cache after each batch (for resumability)
              await this._saveEnrichmentCache(cacheFile, cache);
              console.log(`  💾 Cache updated (${Object.keys(cache).length} videos cached)`);

              // Small delay between batches to respect rate limits
              if (i + batchSize < uncachedVideos.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } catch (error) {
            // Save cache even on error for partial progress
            await this._saveEnrichmentCache(cacheFile, cache);
            
            console.warn(`Failed to enrich videos:`, error.message);
            // Continue with original videos in case of error - don't break the loop
            for (const video of uncachedVideos) {
              enrichedVideos.push(video);
            }
          }
        }
      }

      // Always add the match group to results, even if enrichment failed
      if (matchGroup.opening) {
        enrichedResults.push({
          opening: matchGroup.opening,
          videos: enrichedVideos.length > 0 ? enrichedVideos : videos
        });
      } else {
        enrichedResults.push(...(enrichedVideos.length > 0 ? enrichedVideos : videos));
      }
    }

    // Final cache save
    await this._saveEnrichmentCache(cacheFile, cache);
    console.log(`✅ Enrichment complete: ${totalProcessed} videos processed`);

    return enrichedResults;
  }

  /**
   * Phase 4: Update index from RSS feeds (future enhancement)
   */
  async updateFromRSSFeeds(channelIds = []) {
    const updates = {
      newVideos: 0,
      updatedVideos: 0,
      errors: []
    };

    try {
      for (const channelId of channelIds) {
        try {
          const rssFeed = await this.youtubeService.getChannelRSSFeed(channelId);
          const existingVideos = this.localIndex.get(channelId) || [];
          
          // Find new videos
          const newVideos = rssFeed.videos.filter(video => 
            !existingVideos.some(existing => existing.id === video.id)
          );

          if (newVideos.length > 0) {
            const updatedVideos = [...existingVideos, ...newVideos];
            this.localIndex.set(channelId, updatedVideos);
            updates.newVideos += newVideos.length;
          }
        } catch (error) {
          updates.errors.push({
            channelId,
            error: error.message
          });
        }
      }

      return updates;
    } catch (error) {
      throw new Error(`Failed to update from RSS feeds: ${error.message}`);
    }
  }

  /**
   * Cache Management Helper Methods
   */

  async _loadEnrichmentCache(cacheFile) {
    try {
      const data = await this.fileSystem.readFile(cacheFile, 'utf8');
      const cache = JSON.parse(data);
      console.log(`📁 Loaded enrichment cache: ${Object.keys(cache).length} entries`);
      return cache;
    } catch (error) {
      console.log(`📁 No existing cache found, starting fresh`);
      return {};
    }
  }

  async _saveEnrichmentCache(cacheFile, cache) {
    try {
      // Ensure directory exists
      const dir = path.dirname(cacheFile);
      await this.fileSystem.mkdir(dir, { recursive: true });
      
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
        entries: Object.keys(cache).length,
        ...cache
      };
      
      await this.fileSystem.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.warn(`⚠️  Failed to save cache: ${error.message}`);
    }
  }

  _isCacheValid(cachedVideo) {
    if (!cachedVideo || !cachedVideo.metadata) return false;
    
    // Cache is valid for 7 days
    const cacheAge = Date.now() - new Date(cachedVideo.metadata.indexedAt).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    
    return cacheAge < maxAge;
  }

  /**
   * Analysis Helper Methods
   */

  _generateSearchPatterns(opening) {
    const patterns = [];
    
    // Core patterns
    patterns.push(opening.name.toLowerCase());
    patterns.push(opening.eco.toLowerCase());
    
    // Variation patterns
    if (opening.variation) {
      patterns.push(opening.variation.toLowerCase());
    }
    
    // Common alternative names
    if (opening.aliases) {
      patterns.push(...opening.aliases.map(alias => alias.toLowerCase()));
    }

    // Enhanced pattern generation
    const nameWords = opening.name.toLowerCase().split(' ');
    const significantWords = nameWords.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'defense', 'attack', 'gambit', 'opening'].includes(word)
    );

    // Add individual significant words
    significantWords.forEach(word => {
      patterns.push(word);
    });

    // Chess-specific pattern combinations
    const chessKeywords = [
      'opening', 'theory', 'repertoire', 'preparation', 'analysis', 
      'strategy', 'tactical', 'positional', 'endgame', 'middlegame',
      'chess', 'lesson', 'tutorial', 'guide', 'masterclass',
      'explained', 'basics', 'advanced', 'complete', 'course'
    ];
    
    // Combine opening name words with chess keywords
    significantWords.forEach(word => {
      chessKeywords.forEach(keyword => {
        patterns.push(`${word} ${keyword}`);
        patterns.push(`${keyword} ${word}`);
      });
    });

    // ECO code combinations
    if (opening.eco) {
      patterns.push(`${opening.eco} opening`);
      patterns.push(`${opening.eco} chess`);
      patterns.push(`${opening.eco} theory`);
    }

    // Remove duplicates and very short patterns
    const uniquePatterns = [...new Set(patterns)]
      .filter(pattern => pattern.length >= 3)
      .sort((a, b) => b.length - a.length); // Longer patterns first

    return uniquePatterns;
  }

  _matchesAnyPattern(video, patterns) {
    const titleText = video.title.toLowerCase();
    const descriptionText = (video.description || '').toLowerCase();
    const tagsText = (video.tags || []).join(' ').toLowerCase();
    
    // Combine all searchable text
    const searchText = `${titleText} ${descriptionText} ${tagsText}`;
    
    return patterns.some(pattern => searchText.includes(pattern));
  }

  _calculateMatchScore(video, opening, patterns) {
    let score = 0;
    const titleText = video.title.toLowerCase();
    const descriptionText = (video.description || '').toLowerCase();
    const tagsText = (video.tags || []).join(' ').toLowerCase();
    
    // Enhanced pattern matching with weights
    patterns.forEach(pattern => {
      const patternLower = pattern.toLowerCase();
      
      // Title matches are worth the most (weight: 15)
      if (titleText.includes(patternLower)) {
        score += 15;
      }
      
      // Tag matches are very valuable (weight: 12)
      if (tagsText.includes(patternLower)) {
        score += 12;
      }
      
      // Description matches (weight: 5)  
      if (descriptionText.includes(patternLower)) {
        score += 5;
      }
    });

    // Video quality and engagement factors
    if (video.statistics) {
      const viewCount = parseInt(video.statistics.viewCount) || 0;
      const likeCount = parseInt(video.statistics.likeCount) || 0;
      const commentCount = parseInt(video.statistics.commentCount) || 0;
      
      // View count contribution (logarithmic scale)
      if (viewCount > 0) {
        score += Math.log10(viewCount) * 2; // 2-8 points typically
      }
      
      // Engagement contribution
      const totalEngagement = likeCount + commentCount;
      if (totalEngagement > 0 && viewCount > 0) {
        const engagementRate = totalEngagement / viewCount;
        score += Math.min(engagementRate * 1000, 10); // Cap at 10 points
      }
    }

    // Content quality bonuses
    if (video.contentDetails) {
      // HD video bonus
      if (video.contentDetails.definition === 'hd') {
        score += 3;
      }
      
      // Captions bonus (educational content)
      if (video.contentDetails.caption === 'true') {
        score += 2;
      }
    }

    // Category bonus (Education category is 27)
    if (video.categoryId === '27') {
      score += 5;
    }

    // Topic categories bonus (chess-related topics)
    if (video.topicDetails && video.topicDetails.topicCategories) {
      const hasChessTopic = video.topicDetails.topicCategories.some(category => 
        category.toLowerCase().includes('chess') || 
        category.toLowerCase().includes('game') ||
        category.toLowerCase().includes('strategy')
      );
      if (hasChessTopic) {
        score += 8;
      }
    }

    // Language bonus (English content preferred)
    if (video.defaultLanguage === 'en') {
      score += 2;
    }

    // Trusted channel bonus
    const trustedChannelBoost = this._analyzeChannelQuality(video.channelId);
    if (trustedChannelBoost === 'high') {
      score *= 1.3; // 30% boost for trusted channels
    } else if (trustedChannelBoost === 'medium') {
      score *= 1.1; // 10% boost for medium quality channels
    }

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  _analyzeDifficulty(details) {
    const text = `${details.title} ${details.description}`.toLowerCase();
    
    if (text.includes('beginner') || text.includes('basic')) return 'beginner';
    if (text.includes('intermediate')) return 'intermediate';
    if (text.includes('advanced') || text.includes('master')) return 'advanced';
    
    return 'intermediate'; // default
  }

  _analyzeContentType(details) {
    const text = `${details.title} ${details.description}`.toLowerCase();
    
    if (text.includes('game') || text.includes('analysis')) return 'game-analysis';
    if (text.includes('lesson') || text.includes('tutorial')) return 'lesson';
    if (text.includes('theory') || text.includes('opening')) return 'theory';
    
    return 'general';
  }

  /**
   * Enhanced analysis methods using rich metadata
   */
  _analyzeDifficultyFromMetadata(video) {
    const title = video.title.toLowerCase();
    const tags = (video.tags || []).map(tag => tag.toLowerCase());
    const description = (video.description || '').toLowerCase();
    
    const allText = [title, ...tags, description].join(' ');
    
    // Advanced difficulty detection
    if (allText.includes('beginner') || allText.includes('basics') || 
        allText.includes('introduction') || allText.includes('learn') ||
        allText.includes('starter') || allText.includes('first')) {
      return 'beginner';
    }
    
    if (allText.includes('advanced') || allText.includes('master') || 
        allText.includes('expert') || allText.includes('grandmaster') ||
        allText.includes('complex') || allText.includes('deep')) {
      return 'advanced';
    }
    
    if (allText.includes('intermediate') || allText.includes('improving') ||
        allText.includes('club')) {
      return 'intermediate';
    }
    
    // Category-based detection (Education category often has structured content)
    if (video.categoryId === '27' && tags.some(tag => 
      ['tutorial', 'lesson', 'course', 'guide'].includes(tag))) {
      return 'intermediate';
    }
    
    return 'intermediate'; // default
  }

  _analyzeContentTypeFromMetadata(video) {
    const title = video.title.toLowerCase();
    const tags = (video.tags || []).map(tag => tag.toLowerCase());
    const description = (video.description || '').toLowerCase();
    
    const allText = [title, ...tags, description].join(' ');
    
    // Game analysis detection
    if (allText.includes('game') || allText.includes('played') || 
        allText.includes('analysis') || allText.includes('annotated') ||
        allText.includes('vs') || allText.includes('versus')) {
      return 'game-analysis';
    }
    
    // Tutorial/lesson detection
    if (allText.includes('lesson') || allText.includes('tutorial') || 
        allText.includes('learn') || allText.includes('how to') ||
        allText.includes('explained') || allText.includes('guide')) {
      return 'tutorial';
    }
    
    // Theory detection
    if (allText.includes('opening') || allText.includes('repertoire') || 
        allText.includes('theory') || allText.includes('preparation') ||
        allText.includes('system') || allText.includes('variation')) {
      return 'opening-theory';
    }
    
    // Live/stream detection
    if (allText.includes('live') || allText.includes('stream') ||
        video.liveBroadcastContent === 'live' || video.liveBroadcastContent === 'upcoming') {
      return 'live-content';
    }
    
    return 'general';
  }

  _analyzeVideoQuality(video) {
    let qualityScore = 0;
    
    // HD video
    if (video.contentDetails?.definition === 'hd') {
      qualityScore += 2;
    }
    
    // Has captions
    if (video.contentDetails?.caption === 'true') {
      qualityScore += 2;
    }
    
    // Embeddable
    if (video.status?.embeddable === true) {
      qualityScore += 1;
    }
    
    // Public stats viewable
    if (video.status?.publicStatsViewable === true) {
      qualityScore += 1;
    }
    
    // Duration (educational content often 10-30 minutes)
    if (video.contentDetails?.duration) {
      const duration = video.contentDetails.duration;
      // PT10M30S format - check if between 5-45 minutes
      if (duration.includes('M') && !duration.includes('H')) {
        const minutes = parseInt(duration.match(/(\d+)M/)?.[1] || '0');
        if (minutes >= 5 && minutes <= 45) {
          qualityScore += 1;
        }
      }
    }
    
    if (qualityScore >= 5) return 'high';
    if (qualityScore >= 3) return 'medium';
    return 'low';
  }

  _calculateEngagementMetrics(video) {
    if (!video.statistics) {
      return { engagementRate: 0, likeRatio: 0, commentRatio: 0 };
    }
    
    const viewCount = parseInt(video.statistics.viewCount) || 0;
    const likeCount = parseInt(video.statistics.likeCount) || 0;
    const commentCount = parseInt(video.statistics.commentCount) || 0;
    
    const engagementRate = viewCount > 0 ? (likeCount + commentCount) / viewCount : 0;
    const likeRatio = viewCount > 0 ? likeCount / viewCount : 0;
    const commentRatio = viewCount > 0 ? commentCount / viewCount : 0;
    
    return {
      engagementRate: Math.round(engagementRate * 10000) / 10000, // 4 decimal places
      likeRatio: Math.round(likeRatio * 10000) / 10000,
      commentRatio: Math.round(commentRatio * 10000) / 10000
    };
  }

  _assessEducationalValue(video) {
    let educationalScore = 0;
    
    // Education category
    if (video.categoryId === '27') {
      educationalScore += 3;
    }
    
    // Chess-related topics
    if (video.topicDetails?.topicCategories?.some(cat => 
      cat.toLowerCase().includes('chess') || cat.toLowerCase().includes('strategy'))) {
      educationalScore += 2;
    }
    
    // Educational tags
    const educationalTags = ['tutorial', 'lesson', 'course', 'guide', 'learn', 'education'];
    const tagMatches = (video.tags || []).filter(tag => 
      educationalTags.some(eduTag => tag.toLowerCase().includes(eduTag))
    ).length;
    educationalScore += Math.min(tagMatches, 3);
    
    // Has captions (accessibility)
    if (video.contentDetails?.caption === 'true') {
      educationalScore += 2;
    }
    
    // High engagement suggests quality content
    const engagement = this._calculateEngagementMetrics(video);
    if (engagement.engagementRate > 0.05) { // 5% engagement is very high
      educationalScore += 2;
    }
    
    if (educationalScore >= 7) return 'high';
    if (educationalScore >= 4) return 'medium';
    return 'low';
  }

  /**
   * Lightweight analysis methods using only title/channel data (no API calls)
   */
  _analyzeDifficultyFromTitle(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('beginner') || titleLower.includes('basics') || titleLower.includes('introduction')) {
      return 'beginner';
    }
    if (titleLower.includes('advanced') || titleLower.includes('master') || titleLower.includes('expert')) {
      return 'advanced';
    }
    return 'intermediate';
  }

  _analyzeContentTypeFromTitle(title) {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('game') || titleLower.includes('played') || titleLower.includes('vs')) {
      return 'game-analysis';
    }
    if (titleLower.includes('lesson') || titleLower.includes('tutorial') || titleLower.includes('learn')) {
      return 'tutorial';
    }
    if (titleLower.includes('opening') || titleLower.includes('repertoire') || titleLower.includes('theory')) {
      return 'opening-theory';
    }
    return 'general';
  }

  _analyzeChannelQuality(channelId) {
    // Rate based on known trusted channels from config
    const trustedChannels = {
      'UCkJdvwRC-oGPhRHW_XPNokg': 'high', // Hanging Pawns
      'UCQHX6ViZmPsWiYSFAyS0a3Q': 'high', // Saint Louis Chess Club
      'UCg-wU7HD7I7LddQVDXnfQvA': 'high', // GothamChess
      // Add more trusted channels
    };
    
    return trustedChannels[channelId] || 'medium';
  }

  /**
   * Legacy methods (kept for compatibility but should not be used)
   */
  _analyzeDifficulty(details) {
    // Analyze based on title patterns, keywords in description
    const title = details.title?.toLowerCase() || '';
    const description = details.description?.toLowerCase() || '';
    
    if (title.includes('beginner') || description.includes('beginner')) return 'beginner';
    if (title.includes('advanced') || description.includes('advanced')) return 'advanced';
    return 'intermediate';
  }

  _analyzeContentType(details) {
    const title = details.title?.toLowerCase() || '';
    const description = details.description?.toLowerCase() || '';
    
    if (title.includes('game') || description.includes('game analysis')) return 'game-analysis';
    if (title.includes('lesson') || description.includes('tutorial')) return 'tutorial';
    if (title.includes('opening') || description.includes('theory')) return 'opening-theory';
    return 'general';
  }

  _analyzeInstructorQuality(details) {
    // Analyze channel reputation, video quality metrics
    const viewCount = parseInt(details.statistics?.viewCount) || 0;
    const likeCount = parseInt(details.statistics?.likeCount) || 0;
    const commentCount = parseInt(details.statistics?.commentCount) || 0;
    
    const engagementScore = (likeCount + commentCount) / Math.max(viewCount, 1);
    
    if (engagementScore > 0.05) return 'high';
    if (engagementScore > 0.02) return 'medium';
    return 'low';
  }

  /**
   * Utility Methods
   */

  async saveIndex(filePath) {
    const indexData = {
      localIndex: Array.from(this.localIndex.entries()),
      enrichedVideos: Array.from(this.enrichedVideos.entries()),
      metadata: {
        savedAt: new Date().toISOString(),
        totalVideos: this.localIndex.size,
        version: '1.0.0'
      }
    };

    await fs.writeFile(filePath, JSON.stringify(indexData, null, 2));
  }

  async loadIndex(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const indexData = JSON.parse(data);
      
      this.localIndex = new Map(indexData.localIndex);
      this.enrichedVideos = new Map(indexData.enrichedVideos);
      
      return indexData.metadata;
    } catch (error) {
      throw new Error(`Failed to load index: ${error.message}`);
    }
  }

  getIndexStats() {
    return {
      totalChannels: this.localIndex.size,
      totalVideos: Array.from(this.localIndex.values()).reduce((sum, videos) => sum + videos.length, 0),
      enrichedVideos: this.enrichedVideos.size,
      indexSize: this.localIndex.size
    };
  }

  /**
   * Legacy enrichment method for backward compatibility with match groups
   */
  async _enrichWithVideoDetailsLegacy(matchedVideos, options = {}) {
    const {
      cacheFile = 'data/enrichment_cache.json',
      progressCallback = null,
      batchSize = 50
    } = options;

    // Load existing cache
    const cache = await this._loadEnrichmentCache(cacheFile);
    const enrichedResults = [];
    let totalProcessed = 0;
    let totalVideos = 0;

    // Handle both array and Map input
    const videoArray = Array.isArray(matchedVideos) ? matchedVideos : Array.from(matchedVideos.values());

    // Count total videos for progress tracking
    for (const matchGroup of videoArray) {
      const videos = matchGroup.videos || matchGroup;
      totalVideos += videos.length;
    }

    console.log(`🎬 Starting video enrichment: ${totalVideos} videos to process`);

    for (const matchGroup of videoArray) {
      const enrichedVideos = [];
      const videos = matchGroup.videos || matchGroup;
      
      if (videos.length > 0) {
        // Separate cached vs uncached videos
        const uncachedVideos = [];
        const cachedVideos = [];

        for (const video of videos) {
          if (cache[video.id] && this._isCacheValid(cache[video.id])) {
            cachedVideos.push({
              video,
              enriched: cache[video.id]
            });
          } else {
            uncachedVideos.push(video);
          }
        }

        console.log(`  📊 Cache status: ${cachedVideos.length} cached, ${uncachedVideos.length} need enrichment`);

        // Process cached videos (instant)
        for (const { video, enriched } of cachedVideos) {
          enrichedVideos.push(enriched);
          this.enrichedVideos.set(video.id, enriched);
          totalProcessed++;

          // Report progress
          if (progressCallback) {
            progressCallback({
              processed: totalProcessed,
              total: totalVideos,
              current: video.title,
              fromCache: true,
              percentage: Math.round((totalProcessed / totalVideos) * 100)
            });
          }
        }

        // Process uncached videos in batches
        if (uncachedVideos.length > 0) {
          try {
            for (let i = 0; i < uncachedVideos.length; i += batchSize) {
              const batch = uncachedVideos.slice(i, i + batchSize);
              console.log(`  🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uncachedVideos.length/batchSize)} (${batch.length} videos)`);

              // NO EXPENSIVE API CALLS! Use existing playlist data
              // We already have title, description, publishedAt, thumbnails from getChannelPlaylistItems
              
              // Enrich each video in the batch using existing data only
              for (let j = 0; j < batch.length; j++) {
                const video = batch[j];
                
                // Create enriched video using existing data (no API calls!)
                const enrichedVideo = {
                  id: video.id,
                  title: video.title,
                  description: video.description,
                  publishedAt: video.publishedAt,
                  channelId: video.channelId,
                  channelTitle: video.channelTitle,
                  thumbnails: video.thumbnails,
                  
                  // Generate YouTube URL - this is all we really need!
                  url: `https://www.youtube.com/watch?v=${video.id}`,
                  
                  // Analysis based on existing data (no API calls)
                  analysis: {
                    relevanceScore: video.matchScore || 0,
                    difficultyLevel: this._analyzeDifficultyFromTitle(video.title),
                    contentType: this._analyzeContentTypeFromTitle(video.title),
                    instructorQuality: this._analyzeChannelQuality(video.channelId)
                  },
                  metadata: {
                    indexedAt: new Date().toISOString(),
                    source: 'channel-first-indexer',
                    version: '1.0.0',
                    cached: false
                  }
                };
                
                enrichedVideos.push(enrichedVideo);
                this.enrichedVideos.set(video.id, enrichedVideo);
                
                // Update cache
                cache[video.id] = enrichedVideo;
                
                totalProcessed++;

                // Report progress
                if (progressCallback) {
                  progressCallback({
                    processed: totalProcessed,
                    total: totalVideos,
                    current: video.title,
                    fromCache: false,
                    percentage: Math.round((totalProcessed / totalVideos) * 100)
                  });
                }
              }

              // Save cache after each batch (for resumability)
              await this._saveEnrichmentCache(cacheFile, cache);
              console.log(`  💾 Cache updated (${Object.keys(cache).length} videos cached)`);

              // Small delay between batches to respect rate limits
              if (i + batchSize < uncachedVideos.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          } catch (error) {
            // Save cache even on error for partial progress
            await this._saveEnrichmentCache(cacheFile, cache);
            
            console.warn(`Failed to enrich videos:`, error.message);
            // Continue with original videos in case of error - don't break the loop
            for (const video of uncachedVideos) {
              enrichedVideos.push(video);
            }
          }
        }
      }

      // Always add the match group to results, even if enrichment failed
      if (matchGroup.opening) {
        enrichedResults.push({
          opening: matchGroup.opening,
          videos: enrichedVideos.length > 0 ? enrichedVideos : videos
        });
      } else {
        enrichedResults.push(...(enrichedVideos.length > 0 ? enrichedVideos : videos));
      }
    }

    // Final cache save
    await this._saveEnrichmentCache(cacheFile, cache);
    console.log(`✅ Enrichment complete: ${totalProcessed} videos processed`);

    return enrichedResults;
  }
}

module.exports = ChannelFirstIndexer;

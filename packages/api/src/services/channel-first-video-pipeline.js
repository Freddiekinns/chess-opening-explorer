const fs = require('fs').promises;
const path = require('path');
const YouTubeService = require('./youtube-service');
const VideoProcessor = require('./video-processor');
const ChannelFirstIndexer = require('./channel-first-indexer');
const VideoAccessService = require('./video-access-service');

/**
 * Channel-First Video Pipeline - Production Implementation
 * 
 * Revolutionary approach using Channel-First Indexing:
 * 1. Build comprehensive local index from trusted channels
 * 2. Match openings to videos using intelligent pattern matching
 * 3. Enrich matched videos with detailed metadata
 * 4. Integrate with existing video processing pipeline
 */
class ChannelFirstVideoPipeline {
  constructor(config = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.YOUTUBE_API_KEY,
      quotaLimit: config.quotaLimit || 10000,
      maxResults: config.maxResults || 3,
      batchSize: config.batchSize || 10,
      requestsPerSecond: config.requestsPerSecond || 1,
      ...config
    };
    
    // Initialize services
    this.youtubeService = new YouTubeService(this.config);
    this.videoProcessor = new VideoProcessor(this.youtubeService, this.createDatabaseService());
    this.channelIndexer = new ChannelFirstIndexer({
      youtubeService: this.youtubeService,
      config: this.config
    });
    this.videoAccessService = new VideoAccessService();
    
    // Processing state
    this.checkpointFile = path.join(process.cwd(), 'channel_first_checkpoint.json');
    this.metadataFile = path.join(process.cwd(), 'data', 'video_processing_metadata.json');
    this.indexFile = path.join(process.cwd(), 'data', 'channel_first_index.json');
    this.processingMetadata = null;
    this.indexBuilt = false;
    this.metrics = {
      processed: 0,
      errors: 0,
      videosAdded: 0,
      skipped: 0,
      quotaUsed: 0,
      indexSize: 0,
      matchingTime: 0
    };
  }

  /**
   * Create a database service for updating ECO JSON files
   */
  createDatabaseService() {
    return {
      updateAnalysisJson: async (fen, analysisJson, eco, name) => {
        try {
          const ecoLetter = eco.charAt(0).toLowerCase();
          const ecoFile = path.join(process.cwd(), 'data', 'eco', `eco${ecoLetter.toUpperCase()}.json`);
          
          // Read existing data
          const data = await fs.readFile(ecoFile, 'utf8');
          const ecoData = JSON.parse(data);
          
          // Find and update the position
          if (ecoData[fen]) {
            ecoData[fen].analysis = typeof analysisJson === 'string' ? analysisJson : JSON.stringify(analysisJson);
            
            // Write back to file
            await fs.writeFile(ecoFile, JSON.stringify(ecoData, null, 2));
            console.log(`✅ Updated analysis for ${eco} ${name}`);
          }
          
          return true;
        } catch (error) {
          console.error(`❌ Failed to update ${eco} ${name}:`, error.message);
          return false;
        }
      }
    };
  }

  /**
   * Load trusted channels configuration
   */
  async loadChannelsConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'youtube_channels.json');
      const data = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(data);
      return config.trusted_channels || [];
    } catch (error) {
      console.error('❌ Failed to load channels config:', error.message);
      return [];
    }
  }

  /**
   * Main processing pipeline using Channel-First Indexing
   */
  async processOpenings(options = {}) {
    try {
      console.log('🚀 Starting Channel-First Video Pipeline');
      console.log('=' .repeat(50));
      
      // Phase 1: Build Local Index
      console.log('\n🏗️  Phase 1: Building Local Index');
      const indexStats = await this.buildLocalIndex(options);
      
      // Phase 2: Get openings to process
      console.log('\n📋 Phase 2: Loading Openings');
      const openings = await this.getOpeningsToProcess(options.ecoCode);
      
      if (openings.length === 0) {
        console.log('✅ No openings need video processing');
        return { processed: 0, errors: 0, videosAdded: 0 };
      }
      
      console.log(`📊 Found ${openings.length} openings to process`);
      
      // Phase 3: Match openings to videos
      console.log('\n🎯 Phase 3: Matching Openings to Videos');
      const matchingStartTime = Date.now();
      const matches = await this.channelIndexer.matchOpeningsToVideos(openings);
      this.metrics.matchingTime = Date.now() - matchingStartTime;
      
      console.log(`✅ Matched ${matches.length} openings to videos in ${this.metrics.matchingTime}ms`);
      
      // Save matches checkpoint before enrichment (for resumability)
      console.log('💾 Saving matches checkpoint...');
      await this.saveMatchesCheckpoint(matches, openings);
      
      // Phase 4: Enrich and process videos
      console.log('\n🔍 Phase 4: Enriching Videos');
      const results = await this.enrichAndProcessVideos(matches, options);
      
      // Phase 5: Save results
      console.log('\n💾 Phase 5: Saving Results');
      await this.saveResults(results);
      
      // Report final results
      this.reportResults(results);
      
      return results;
      
    } catch (error) {
      console.error('💥 Pipeline error:', error.message);
      throw error;
    }
  }

  /**
   * Build comprehensive local index from trusted channels
   */
  async buildLocalIndex(options = {}) {
    try {
      // Check if index already exists and is recent
      if (await this.isIndexRecent() && !options.forceRebuild) {
        console.log('📚 Loading existing index...');
        const metadata = await this.channelIndexer.loadIndex(this.indexFile);
        this.indexBuilt = true;
        this.metrics.indexSize = this.channelIndexer.getIndexStats().totalVideos;
        console.log(`✅ Loaded index with ${this.metrics.indexSize} videos`);
        return metadata;
      }
      
      // Load channels configuration
      const channels = await this.loadChannelsConfig();
      const channelIds = channels.map(c => c.channel_id);
      
      console.log(`🔍 Building index from ${channelIds.length} trusted channels...`);
      
      // Build the index
      const results = await this.channelIndexer.buildLocalIndex(channelIds);
      
      // Save the index
      await this.channelIndexer.saveIndex(this.indexFile);
      
      this.indexBuilt = true;
      this.metrics.indexSize = results.totalVideos;
      this.metrics.quotaUsed += results.totalVideos * 2; // Updated quota calculation (playlist + details)
      
      console.log(`✅ Index built: ${results.totalVideos} videos from ${results.channelsCovered} channels`);
      console.log(`📊 Enhanced metadata: Videos now include statistics, tags, and quality metrics`);
      
      if (results.errors.length > 0) {
        console.log(`⚠️  Errors: ${results.errors.length} channels failed`);
        results.errors.forEach(err => 
          console.log(`   - ${err.channelId}: ${err.error}`)
        );
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to build local index:', error.message);
      throw error;
    }
  }

  /**
   * Check if existing index is recent enough
   */
  async isIndexRecent() {
    try {
      const stats = await fs.stat(this.indexFile);
      const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate < 7; // Index is valid for 7 days
    } catch (error) {
      return false; // Index doesn't exist
    }
  }

  /**
   * Get openings to process from ECO files
   */
  async getOpeningsToProcess(ecoCode) {
    try {
      const openings = [];
      
      // Determine which ECO files to process
      const ecoFiles = ecoCode ? [`eco${ecoCode.toUpperCase()}.json`] : 
                      ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
      
      for (const filename of ecoFiles) {
        const filepath = path.join(process.cwd(), 'data', 'eco', filename);
        
        try {
          const data = await fs.readFile(filepath, 'utf8');
          const ecoData = JSON.parse(data);
          
          // Convert ECO data structure to positions array
          const positions = [];
          for (const [fen, positionData] of Object.entries(ecoData)) {
            // NEW: Check for existing videos using FEN-based storage
            const hasVideos = await this.videoAccessService.hasExistingVideos(fen);
            if (hasVideos) {
              continue; // Skip positions that already have videos
            }
            
            positions.push({
              fen,
              eco: positionData.eco,
              name: positionData.name,
              moves: positionData.moves,
              analysis: positionData.analysis_json
            });
          }
          
          console.log(`📄 ${filename}: ${positions.length} positions need videos`);
          openings.push(...positions);
          
        } catch (error) {
          console.error(`❌ Failed to read ${filename}:`, error.message);
        }
      }
      
      return openings;
      
    } catch (error) {
      console.error('❌ Failed to get openings:', error.message);
      return [];
    }
  }

  /**
   * Enrich matched videos and process them
   */
  async enrichAndProcessVideos(matches, options = {}) {
    const results = {
      processed: 0,
      errors: 0,
      videosAdded: 0,
      skipped: 0
    };
    
    try {
      // Step 1: Deduplicate videos across all openings
      console.log(`🔍 Deduplicating videos across ${matches.length} matched openings...`);
      const { uniqueVideos, videoToOpeningsMap } = this.deduplicateVideos(matches);
      
      console.log(`📊 Deduplication results:`);
      console.log(`   - Total video instances: ${matches.reduce((sum, m) => sum + m.videos.length, 0)}`);
      console.log(`   - Unique videos: ${uniqueVideos.length}`);
      console.log(`   - Efficiency gain: ${((1 - uniqueVideos.length / matches.reduce((sum, m) => sum + m.videos.length, 0)) * 100).toFixed(1)}% reduction`);

      // Step 2: Enrich unique videos only (with cache checking)
      console.log(`🎬 Starting enrichment of ${uniqueVideos.length} unique videos...`);
      
      // Create progress callback for enrichment
      const enrichmentProgress = (progress) => {
        const {
          processed, total, current, fromCache, percentage
        } = progress;
        
        const cacheIndicator = fromCache ? '📋' : '🔄';
        console.log(`  ${cacheIndicator} Progress: ${processed}/${total} (${percentage}%) - ${current.substring(0, 50)}...`);
      };

      // Enrich unique videos with detailed metadata
      const enrichedVideos = await this.channelIndexer.enrichWithVideoDetails(uniqueVideos, {
        progressCallback: enrichmentProgress,
        batchSize: this.config.batchSize || 50,
        cacheFile: 'data/video_enrichment_cache.json'
      });
      
      console.log(`✅ Enrichment complete: ${enrichedVideos.length} videos enriched`);
      
      // Step 3: Map enriched videos back to openings
      console.log(`🗺️  Mapping enriched videos back to openings...`);
      const enrichedMatches = this.mapVideosBackToOpenings(enrichedVideos, videoToOpeningsMap, matches);
      
      console.log(`✅ Mapping complete: ${enrichedMatches.length} opening groups ready for processing`);
      
      // Step 4: Process each opening with its enriched videos
      let currentMatch = 0;
      for (const match of enrichedMatches) {
        try {
          currentMatch++;
          const progressPercent = Math.round((currentMatch / enrichedMatches.length) * 100);
          console.log(`🎯 Processing [${currentMatch}/${enrichedMatches.length}] (${progressPercent}%): ${match.opening.eco} ${match.opening.name} (${match.videos.length} videos)`);
          
          // Process videos for this opening
          const processedVideos = await this.processVideosForOpening(match.opening, match.videos, options);
          
          results.processed++;
          results.videosAdded += processedVideos.length;
          
        } catch (error) {
          console.error(`❌ Error processing ${match.opening.eco} ${match.opening.name}:`, error.message);
          results.errors++;
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Failed to enrich and process videos:', error.message);
      throw error;
    }
  }

  /**
   * Deduplicate videos across all matched openings
   */
  deduplicateVideos(matches) {
    const videoMap = new Map(); // videoId -> video object
    const videoToOpeningsMap = new Map(); // videoId -> [openings...]
    
    for (const match of matches) {
      for (const video of match.videos) {
        const videoId = video.id;
        
        // Store unique video
        if (!videoMap.has(videoId)) {
          videoMap.set(videoId, video);
          videoToOpeningsMap.set(videoId, []);
        }
        
        // Track which openings this video matches
        videoToOpeningsMap.get(videoId).push(match.opening);
      }
    }
    
    return {
      uniqueVideos: Array.from(videoMap.values()),
      videoToOpeningsMap
    };
  }

  /**
   * Map enriched videos back to their matched openings
   */
  mapVideosBackToOpenings(enrichedVideos, videoToOpeningsMap, originalMatches) {
    // Create a map of enriched videos by ID for fast lookup
    const enrichedVideoMap = new Map();
    enrichedVideos.forEach(video => {
      enrichedVideoMap.set(video.id, video);
    });
    
    // Rebuild matches with enriched videos
    const enrichedMatches = [];
    
    for (const originalMatch of originalMatches) {
      const enrichedVideosForOpening = [];
      
      for (const video of originalMatch.videos) {
        const enrichedVideo = enrichedVideoMap.get(video.id);
        if (enrichedVideo) {
          enrichedVideosForOpening.push(enrichedVideo);
        } else {
          // Fallback to original video if enrichment failed
          enrichedVideosForOpening.push(video);
        }
      }
      
      enrichedMatches.push({
        opening: originalMatch.opening,
        videos: enrichedVideosForOpening
      });
    }
    
    return enrichedMatches;
  }

  /**
   * Process videos for a specific opening
   */
  async processVideosForOpening(opening, videos, options = {}) {
    const processedVideos = [];
    
    for (const video of videos) {
      try {
        // Create video data structure
        const videoData = {
          id: video.id,
          title: video.title,
          channel: video.channel,
          url: `https://www.youtube.com/watch?v=${video.id}`,
          description: video.description,
          publishedAt: video.publishedAt,
          duration: video.duration,
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          analysis: video.analysis,
          metadata: video.metadata
        };
        
        // Process video using existing video processor
        const processed = await this.videoProcessor.processVideo(videoData, opening);
        
        if (processed) {
          processedVideos.push(processed);
        }
        
      } catch (error) {
        console.error(`❌ Error processing video ${video.id}:`, error.message);
      }
    }
    
    return processedVideos;
  }

  /**
   * Save matches checkpoint for resumability
   */
  async saveMatchesCheckpoint(matches, openings) {
    try {
      const checkpointData = {
        timestamp: new Date().toISOString(),
        phase: 'matching_complete',
        openings_count: openings.length,
        matches_count: matches.length,
        total_video_instances: matches.reduce((sum, m) => sum + m.videos.length, 0),
        metrics: this.metrics,
        matches: matches
      };
      
      await fs.writeFile(this.checkpointFile, JSON.stringify(checkpointData, null, 2));
      console.log(`✅ Matches checkpoint saved to ${this.checkpointFile}`);
      
    } catch (error) {
      console.warn('⚠️  Failed to save matches checkpoint:', error.message);
    }
  }

  /**
   * Load matches checkpoint if available
   */
  async loadMatchesCheckpoint() {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf8');
      const checkpoint = JSON.parse(data);
      
      if (checkpoint.phase === 'matching_complete') {
        console.log(`📋 Found matches checkpoint from ${checkpoint.timestamp}`);
        console.log(`   - ${checkpoint.matches_count} matched openings`);
        console.log(`   - ${checkpoint.total_video_instances} total video instances`);
        return checkpoint;
      }
      
      return null;
    } catch (error) {
      return null; // No checkpoint available
    }
  }

  /**
   * Save processing results
   */
  async saveResults(results) {
    try {
      const resultsFile = path.join(process.cwd(), 'data', 'channel_first_results.json');
      const resultData = {
        timestamp: new Date().toISOString(),
        results,
        metrics: this.metrics,
        indexStats: this.channelIndexer.getIndexStats()
      };
      
      await fs.writeFile(resultsFile, JSON.stringify(resultData, null, 2));
      console.log(`💾 Results saved to ${resultsFile}`);
      
    } catch (error) {
      console.error('❌ Failed to save results:', error.message);
    }
  }

  /**
   * Report processing results
   */
  reportResults(results) {
    console.log('\n📊 Processing Results');
    console.log('=' .repeat(50));
    console.log(`✅ Processed: ${results.processed} openings`);
    console.log(`📹 Videos Added: ${results.videosAdded}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`❌ Errors: ${results.errors}`);
    console.log(`🎯 Index Size: ${this.metrics.indexSize} videos`);
    console.log(`⚡ Matching Time: ${this.metrics.matchingTime}ms`);
    console.log(`📊 Quota Used: ~${this.metrics.quotaUsed} units`);
    
    if (results.processed > 0) {
      const avgVideosPerOpening = results.videosAdded / results.processed;
      console.log(`📈 Average Videos per Opening: ${avgVideosPerOpening.toFixed(1)}`);
    }
  }
}

module.exports = ChannelFirstVideoPipeline;

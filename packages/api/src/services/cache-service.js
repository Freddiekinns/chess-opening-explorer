/**
 * Simple synchronous cache service for Vercel optimization
 * Keeps full search functionality while dramatically improving performance
 */

class SimpleCacheService {
  constructor() {
    // In-memory cache for warm containers
    this.cache = new Map();
    this.cacheTTL = 3600000; // 1 hour in milliseconds
  }

  /**
   * Get cached data or execute function if cache miss/expired
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Synchronous function to execute on cache miss
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {any} Cached or fresh data
   */
  getOrSet(key, fetchFunction, ttl = this.cacheTTL) {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Check if cache hit and not expired
    if (cached && (now - cached.timestamp) < ttl) {
      console.log(`🚀 Cache HIT for ${key} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
      return cached.data;
    }

    // Cache miss or expired - fetch fresh data
    console.log(`🔄 Cache MISS for ${key} - loading fresh data...`);
    try {
      const freshData = fetchFunction();
      
      // Store in cache with timestamp
      this.cache.set(key, {
        data: freshData,
        timestamp: now
      });

      console.log(`✅ Cached ${key} (size: ${JSON.stringify(freshData).length} bytes)`);
      return freshData;
    } catch (error) {
      // If fetch fails and we have stale data, return it
      if (cached) {
        console.warn(`Cache fetch failed for ${key}, returning stale data:`, error.message);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Clear cache for specific key or all keys
   * @param {string} key - Specific key to clear (optional)
   */
  clear(key = null) {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cleared cache for ${key}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ Cleared all cache`);
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, value]) => 
        (now - value.timestamp) < this.cacheTTL
      ).length,
      memoryUsage: JSON.stringify(entries).length, // Rough estimate
      oldestEntry: entries.length > 0 ? 
        Math.min(...entries.map(([_, value]) => value.timestamp)) : null,
      entries: entries.map(([key, value]) => ({
        key,
        age: Math.round((now - value.timestamp) / 1000),
        size: JSON.stringify(value.data).length
      }))
    };
  }

  /**
   * Cleanup expired entries (garbage collection)
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.cacheTTL * 2) { // 2x TTL for cleanup
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🗑️ Cleaned up ${cleaned} expired cache entries`);
    }
  }
}

// Singleton pattern for global cache across function invocations
let globalCacheInstance = null;

/**
 * Get global cache instance (singleton)
 * @returns {SimpleCacheService} Global cache instance
 */
function getGlobalCache() {
  if (!globalCacheInstance) {
    globalCacheInstance = new SimpleCacheService();
    console.log('🏗️ Initialized global cache service');
    
    // Cleanup expired entries every 30 minutes
    setInterval(() => {
      globalCacheInstance.cleanup();
    }, 1800000);
  }
  
  return globalCacheInstance;
}

module.exports = {
  SimpleCacheService,
  getGlobalCache
};

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  /**
   * Set a value in cache with TTL (time to live)
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs = 60000) { // Default 1 minute TTL
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttlMs
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlMs);

    this.timers.set(key, timer);
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Generate cache key from request parameters
   * @param {string} prefix - Key prefix
   * @param {...any} params - Parameters to include in key
   */
  generateKey(prefix, ...params) {
    return `${prefix}:${params.filter(p => p !== undefined && p !== null).join(':')}`;
  }
}

// Cache TTL constants (in milliseconds)
const CACHE_TTL = {
  VERY_SHORT: 15 * 1000,    // 15 seconds - for real-time data
  SHORT: 60 * 1000,         // 1 minute - for dynamic data
  MEDIUM: 5 * 60 * 1000,    // 5 minutes - for semi-static data
  LONG: 30 * 60 * 1000,     // 30 minutes - for static data
  VERY_LONG: 2 * 60 * 60 * 1000  // 2 hours - for rarely changing data
};

// Create global cache instance
const cache = new MemoryCache();

/**
 * Middleware to cache API responses
 * @param {number} ttl - Time to live in milliseconds
 * @param {function} keyGenerator - Function to generate cache key from req
 */
function cacheMiddleware(ttl = CACHE_TTL.SHORT, keyGenerator = null) {
  return (req, res, next) => {
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req) 
      : cache.generateKey('api', req.method, req.originalUrl, req.user?.id || 'anonymous');

    // Try to get from cache
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      console.log(`🚀 Cache HIT: ${key}`);
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`);
        cache.set(key, data, ttl);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Invalidate cache entries by pattern
 * @param {string|RegExp} pattern - Pattern to match cache keys
 */
function invalidateCache(pattern) {
  const keys = Array.from(cache.cache.keys());
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  
  keys.forEach(key => {
    if (regex.test(key)) {
      console.log(`🗑️  Cache INVALIDATE: ${key}`);
      cache.delete(key);
    }
  });
}

module.exports = {
  cache,
  CACHE_TTL,
  cacheMiddleware,
  invalidateCache,
  MemoryCache
};
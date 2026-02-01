/**
 * Cache Service - In-memory caching for performance optimization
 * Provides TTL-based caching with automatic cleanup
 */

const cache = new Map();
const cacheTimestamps = new Map();
const cacheTTLs = new Map();

const DEFAULT_TTL = 300000; // 5 minutes

/**
 * Set a cache entry
 */
const set = (key, value, ttl = DEFAULT_TTL) => {
  cache.set(key, value);
  cacheTimestamps.set(key, Date.now());
  cacheTTLs.set(key, ttl);

  // Schedule cleanup
  setTimeout(() => {
    if (isExpired(key)) {
      del(key);
    }
  }, ttl + 100);

  return true;
};

/**
 * Get a cache entry
 */
const get = (key) => {
  if (!cache.has(key)) {
    return null;
  }

  if (isExpired(key)) {
    del(key);
    return null;
  }

  return cache.get(key);
};

/**
 * Delete a cache entry
 */
const del = (key) => {
  cache.delete(key);
  cacheTimestamps.delete(key);
  cacheTTLs.delete(key);
  return true;
};

/**
 * Check if cache entry is expired
 */
const isExpired = (key) => {
  const timestamp = cacheTimestamps.get(key);
  const ttl = cacheTTLs.get(key) || DEFAULT_TTL;

  if (!timestamp) {
    return true;
  }

  return Date.now() - timestamp > ttl;
};

/**
 * Check if key exists and is valid
 */
const has = (key) => {
  if (!cache.has(key)) {
    return false;
  }

  if (isExpired(key)) {
    del(key);
    return false;
  }

  return true;
};

/**
 * Get or set cache entry
 */
const getOrSet = async (key, fetchFn, ttl = DEFAULT_TTL) => {
  const cached = get(key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetchFn();
  set(key, value, ttl);
  return value;
};

/**
 * Clear all cache entries
 */
const clear = () => {
  cache.clear();
  cacheTimestamps.clear();
  cacheTTLs.clear();
  return true;
};

/**
 * Clear cache entries by pattern
 */
const clearPattern = (pattern) => {
  const regex = new RegExp(pattern);
  let count = 0;

  for (const key of cache.keys()) {
    if (regex.test(key)) {
      del(key);
      count++;
    }
  }

  return count;
};

/**
 * Get cache statistics
 */
const getStats = () => {
  const entries = Array.from(cache.keys());
  let validCount = 0;
  let expiredCount = 0;

  entries.forEach((key) => {
    if (isExpired(key)) {
      expiredCount++;
    } else {
      validCount++;
    }
  });

  return {
    totalEntries: entries.length,
    validEntries: validCount,
    expiredEntries: expiredCount,
    memoryUsage: getMemoryUsage(),
  };
};

/**
 * Estimate memory usage
 */
const getMemoryUsage = () => {
  let size = 0;

  for (const [key, value] of cache.entries()) {
    size += key.length * 2; // Approximate string size
    size += JSON.stringify(value).length * 2;
  }

  return {
    bytes: size,
    kilobytes: size / 1024,
    megabytes: size / (1024 * 1024),
  };
};

/**
 * Get all keys
 */
const keys = () => {
  return Array.from(cache.keys()).filter((key) => !isExpired(key));
};

/**
 * Memoize function result
 */
const memoize = (fn, keyGenerator, ttl = DEFAULT_TTL) => {
  return async (...args) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    return getOrSet(key, () => fn(...args), ttl);
  };
};

/**
 * Cache with tags for group invalidation
 */
const taggedCache = {
  tags: new Map(),

  setWithTags: (key, value, tags = [], ttl = DEFAULT_TTL) => {
    set(key, value, ttl);

    tags.forEach((tag) => {
      if (!taggedCache.tags.has(tag)) {
        taggedCache.tags.set(tag, new Set());
      }
      taggedCache.tags.get(tag).add(key);
    });
  },

  invalidateTag: (tag) => {
    const keys = taggedCache.tags.get(tag);
    if (!keys) return 0;

    let count = 0;
    keys.forEach((key) => {
      del(key);
      count++;
    });

    taggedCache.tags.delete(tag);
    return count;
  },

  getTagKeys: (tag) => {
    return Array.from(taggedCache.tags.get(tag) || []);
  },
};

/**
 * Cleanup expired entries
 */
const cleanup = () => {
  let cleaned = 0;

  for (const key of cache.keys()) {
    if (isExpired(key)) {
      del(key);
      cleaned++;
    }
  }

  return cleaned;
};

// Run cleanup every minute
setInterval(cleanup, 60000);

/**
 * Cache key generators
 */
const keyGenerators = {
  user: (userId) => `user:${userId}`,
  patient: (patientId) => `patient:${patientId}`,
  doctor: (doctorId) => `doctor:${doctorId}`,
  appointment: (appointmentId) => `appointment:${appointmentId}`,
  record: (recordId) => `record:${recordId}`,
  access: (patientId, doctorId) => `access:${patientId}:${doctorId}`,
};

module.exports = {
  set,
  get,
  del,
  has,
  getOrSet,
  clear,
  clearPattern,
  getStats,
  keys,
  memoize,
  taggedCache,
  cleanup,
  keyGenerators,
  DEFAULT_TTL,
};

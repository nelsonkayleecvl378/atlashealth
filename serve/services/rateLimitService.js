/**
 * Rate Limit Service - Handles request rate limiting
 * Prevents abuse and ensures fair resource allocation
 */

const limits = new Map();
const requestCounts = new Map();

const RATE_LIMITS = {
  DEFAULT: { requests: 100, windowMs: 60000 }, // 100 req/min
  AUTH: { requests: 10, windowMs: 60000 }, // 10 req/min for auth
  API: { requests: 200, windowMs: 60000 }, // 200 req/min for API
  APPOINTMENT: { requests: 30, windowMs: 60000 }, // 30 req/min for scheduling
  RECORD: { requests: 10, windowMs: 300000 }, // 10 req/5min for records
  WEBHOOK: { requests: 1000, windowMs: 60000 }, // 1000 req/min for webhooks
};

/**
 * Check if request is rate limited
 */
const checkRateLimit = (key, limitType = "DEFAULT") => {
  const limit = RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  // Get or create request history
  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const requests = requestCounts.get(key);

  // Remove old requests outside the window
  const validRequests = requests.filter((timestamp) => timestamp > windowStart);
  requestCounts.set(key, validRequests);

  // Check if limit exceeded
  if (validRequests.length >= limit.requests) {
    const oldestRequest = validRequests[0];
    const retryAfter = Math.ceil((oldestRequest + limit.windowMs - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit: limit.requests,
      retryAfter,
      resetAt: new Date(oldestRequest + limit.windowMs).toISOString(),
    };
  }

  // Add current request
  validRequests.push(now);
  requestCounts.set(key, validRequests);

  return {
    allowed: true,
    remaining: limit.requests - validRequests.length,
    limit: limit.requests,
    retryAfter: 0,
    resetAt: new Date(now + limit.windowMs).toISOString(),
  };
};

/**
 * Create rate limit key
 */
const createKey = (identifier, endpoint = "") => {
  return `${identifier}:${endpoint}`;
};

/**
 * Reset rate limit for key
 */
const resetLimit = (key) => {
  requestCounts.delete(key);
  return true;
};

/**
 * Get current usage for key
 */
const getUsage = (key, limitType = "DEFAULT") => {
  const limit = RATE_LIMITS[limitType] || RATE_LIMITS.DEFAULT;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  const requests = requestCounts.get(key) || [];
  const validRequests = requests.filter((timestamp) => timestamp > windowStart);

  return {
    key,
    used: validRequests.length,
    limit: limit.requests,
    remaining: Math.max(0, limit.requests - validRequests.length),
    windowMs: limit.windowMs,
  };
};

/**
 * Set custom rate limit for key
 */
const setCustomLimit = (key, requests, windowMs) => {
  limits.set(key, { requests, windowMs });
  return { key, requests, windowMs };
};

/**
 * Remove custom rate limit
 */
const removeCustomLimit = (key) => {
  limits.delete(key);
  return true;
};

/**
 * Get all rate limits
 */
const getRateLimits = () => {
  return { ...RATE_LIMITS };
};

/**
 * Get statistics
 */
const getStatistics = () => {
  let totalTrackedKeys = 0;
  let totalRequests = 0;

  requestCounts.forEach((requests) => {
    totalTrackedKeys++;
    totalRequests += requests.length;
  });

  return {
    trackedKeys: totalTrackedKeys,
    totalRequests,
    customLimits: limits.size,
    memoryUsage: {
      requestCounts: requestCounts.size,
      limits: limits.size,
    },
  };
};

/**
 * Cleanup old entries
 */
const cleanup = () => {
  const now = Date.now();
  let cleaned = 0;

  requestCounts.forEach((requests, key) => {
    const validRequests = requests.filter(
      (timestamp) => timestamp > now - 3600000 // Keep 1 hour
    );

    if (validRequests.length === 0) {
      requestCounts.delete(key);
      cleaned++;
    } else if (validRequests.length !== requests.length) {
      requestCounts.set(key, validRequests);
    }
  });

  return { cleaned };
};

// Cleanup every 5 minutes
setInterval(cleanup, 300000);

/**
 * Rate limit middleware helper
 */
const createMiddleware = (limitType = "DEFAULT") => {
  return (req, res, next) => {
    const key = createKey(
      req.user?.id || req.ip,
      req.path
    );

    const result = checkRateLimit(key, limitType);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", result.resetAt);

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter);
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Rate limit exceeded",
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
};

/**
 * Check sliding window rate limit
 */
const checkSlidingWindow = (key, maxRequests, windowMs) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!requestCounts.has(key)) {
    requestCounts.set(key, []);
  }

  const requests = requestCounts.get(key);
  const validRequests = requests.filter((t) => t > windowStart);

  // Calculate weighted count for sliding window
  const weight = validRequests.reduce((sum, timestamp) => {
    const age = now - timestamp;
    const weightFactor = 1 - age / windowMs;
    return sum + weightFactor;
  }, 0);

  if (weight >= maxRequests) {
    return {
      allowed: false,
      weight,
      limit: maxRequests,
    };
  }

  validRequests.push(now);
  requestCounts.set(key, validRequests);

  return {
    allowed: true,
    weight,
    limit: maxRequests,
    remaining: maxRequests - weight,
  };
};

/**
 * Token bucket rate limiter
 */
const tokenBuckets = new Map();

const checkTokenBucket = (key, bucketSize, refillRate) => {
  const now = Date.now();

  if (!tokenBuckets.has(key)) {
    tokenBuckets.set(key, {
      tokens: bucketSize,
      lastRefill: now,
    });
  }

  const bucket = tokenBuckets.get(key);

  // Refill tokens
  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = (timePassed / 1000) * refillRate;
  bucket.tokens = Math.min(bucketSize, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const waitTime = Math.ceil((1 - bucket.tokens) / refillRate * 1000);
    return {
      allowed: false,
      tokens: bucket.tokens,
      waitTime,
    };
  }

  bucket.tokens -= 1;
  tokenBuckets.set(key, bucket);

  return {
    allowed: true,
    tokens: bucket.tokens,
    bucketSize,
  };
};

module.exports = {
  RATE_LIMITS,
  checkRateLimit,
  createKey,
  resetLimit,
  getUsage,
  setCustomLimit,
  removeCustomLimit,
  getRateLimits,
  getStatistics,
  cleanup,
  createMiddleware,
  checkSlidingWindow,
  checkTokenBucket,
};

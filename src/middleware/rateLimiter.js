const rateLimit = require('express-rate-limit');
const { cache } = require('../config/redis');

/**
 * Global rate limiter middleware
 */
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use Redis for distributed rate limiting
  store: {
    async increment(key) {
      return await cache.increment(`ratelimit:${key}`, 900);
    },
    async decrement(key) {
      // Not implemented for this use case
    },
    async resetKey(key) {
      await cache.del(`ratelimit:${key}`);
    },
  },
});

/**
 * Stricter rate limiter for URL creation
 */
const createUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 URLs per 15 minutes per IP
  message: {
    error: 'Too many URLs created from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Custom abuse detection middleware
 */
const abuseDetection = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `abuse:${ip}`;

  try {
    // Check if IP is blocked
    const isBlocked = await cache.get(`blocked:${ip}`);
    if (isBlocked) {
      return res.status(429).json({
        error: 'Your IP has been temporarily blocked due to abuse detection.',
        unblockAt: isBlocked.unblockAt,
      });
    }

    // Track suspicious patterns
    const suspiciousCount = await cache.get(key) || 0;
    
    // Block if too many suspicious activities
    if (suspiciousCount > 50) {
      const unblockAt = new Date(Date.now() + 3600000); // 1 hour
      await cache.set(`blocked:${ip}`, { unblockAt }, 3600);
      return res.status(429).json({
        error: 'Your IP has been blocked due to suspicious activity.',
        unblockAt,
      });
    }

    next();
  } catch (error) {
    console.error('Abuse detection error:', error);
    next();
  }
};

/**
 * Track suspicious URL patterns
 */
const trackSuspiciousUrl = async (ip, url) => {
  const key = `abuse:${ip}`;
  
  // Check for known malicious patterns
  const suspiciousPatterns = [
    /malware/i,
    /phishing/i,
    /\.exe$/i,
    /\.scr$/i,
    /bit\.ly/i, // Prevent double shortening
    /tinyurl\.com/i,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (isSuspicious) {
    await cache.increment(key, 3600);
    return true;
  }

  return false;
};

module.exports = {
  globalLimiter,
  createUrlLimiter,
  abuseDetection,
  trackSuspiciousUrl,
};

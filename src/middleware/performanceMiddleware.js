const { metricsCollector } = require('./metricsCollector');

/**
 * Middleware to track performance metrics for each request
 */
const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  // Intercept the response
  const originalSend = res.send;
  const originalJson = res.json;
  const originalRedirect = res.redirect;

  let tracked = false; // Prevent double tracking
  
  const endTracking = () => {
    if (tracked) return; // Already tracked
    tracked = true;
    
    const endTime = process.hrtime.bigint();
    const latency = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds

    // Track rate limiting blocks (only once per request)
    if (res.statusCode === 429) {
      metricsCollector.trackRateLimitBlock();
    }

    // Track redirects (for short URL redirects)
    if (req.path.match(/^\/[a-zA-Z0-9]{7,10}$/) && req.method === 'GET') {
      const cacheHit = res.locals.cacheHit || false;
      const error = res.statusCode >= 400;
      metricsCollector.trackRedirect(latency, cacheHit, error);
    }

    // Track URL creation
    if (req.path === '/api/shorten' && req.method === 'POST') {
      const error = res.statusCode >= 400;
      metricsCollector.trackUrlCreation(latency, error);
    }
  };

  res.send = function (data) {
    endTracking();
    originalSend.call(this, data);
  };

  res.json = function (data) {
    endTracking();
    originalJson.call(this, data);
  };

  res.redirect = function (...args) {
    endTracking();
    originalRedirect.apply(this, args);
  };

  next();
};

/**
 * Expose metrics endpoint for monitoring
 */
const metricsEndpoint = (req, res) => {
  const format = req.query.format || 'json';

  if (format === 'summary' || format === 'text') {
    res.set('Content-Type', 'text/plain');
    res.send(metricsCollector.getSummary());
  } else {
    res.json(metricsCollector.getReport());
  }
};

/**
 * Export metrics to file
 */
const exportMetrics = (req, res) => {
  try {
    const filename = req.query.filename || 'metrics-report.json';
    const filepath = metricsCollector.exportToFile(filename);
    res.json({
      success: true,
      message: 'Metrics exported successfully',
      filepath: filepath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Reset metrics
 */
const resetMetrics = (req, res) => {
  metricsCollector.reset();
  res.json({
    success: true,
    message: 'Metrics reset successfully',
  });
};

module.exports = {
  performanceMiddleware,
  metricsEndpoint,
  exportMetrics,
  resetMetrics,
  metricsCollector,
};

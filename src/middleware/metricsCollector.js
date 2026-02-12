const fs = require('fs');
const path = require('path');

class MetricsCollector {
  constructor() {
    this.metrics = {
      redirects: {
        total: 0,
        cacheHits: 0,
        cacheMisses: 0,
        latencies: [],
        errorsCount: 0,
      },
      urlCreation: {
        total: 0,
        latencies: [],
        errorsCount: 0,
      },
      rateLimiting: {
        requestsBlocked: 0,
        totalRequests: 0,
      },
      database: {
        queryTimes: [],
        totalQueries: 0,
      },
      server: {
        startTime: Date.now(),
        requestsPerMinute: [],
        concurrentRequests: 0,
        peakConcurrentRequests: 0,
      },
    };

    // Track requests per minute
    this.startRequestTracking();
  }

  startRequestTracking() {
    const minute = 60 * 1000;
    let requestsInCurrentMinute = 0;

    setInterval(() => {
      this.metrics.server.requestsPerMinute.push({
        timestamp: new Date().toISOString(),
        count: requestsInCurrentMinute,
      });

      // Keep only last 60 minutes
      if (this.metrics.server.requestsPerMinute.length > 60) {
        this.metrics.server.requestsPerMinute.shift();
      }

      requestsInCurrentMinute = 0;
    }, minute);

    // Middleware to track requests
    this.requestCounter = (req, res, next) => {
      requestsInCurrentMinute++;
      this.metrics.rateLimiting.totalRequests++;

      // Track concurrent requests
      this.metrics.server.concurrentRequests++;
      if (this.metrics.server.concurrentRequests > this.metrics.server.peakConcurrentRequests) {
        this.metrics.server.peakConcurrentRequests = this.metrics.server.concurrentRequests;
      }

      res.on('finish', () => {
        this.metrics.server.concurrentRequests--;
      });

      next();
    };
  }

  // Track redirect performance
  trackRedirect(latency, cacheHit, error = false) {
    this.metrics.redirects.total++;
    if (cacheHit) {
      this.metrics.redirects.cacheHits++;
    } else {
      this.metrics.redirects.cacheMisses++;
    }
    this.metrics.redirects.latencies.push(latency);

    if (error) {
      this.metrics.redirects.errorsCount++;
    }

    // Keep only last 10000 latencies to prevent memory issues
    if (this.metrics.redirects.latencies.length > 10000) {
      this.metrics.redirects.latencies = this.metrics.redirects.latencies.slice(-5000);
    }
  }

  // Track URL creation
  trackUrlCreation(latency, error = false) {
    this.metrics.urlCreation.total++;
    this.metrics.urlCreation.latencies.push(latency);

    if (error) {
      this.metrics.urlCreation.errorsCount++;
    }

    // Keep only last 10000 latencies
    if (this.metrics.urlCreation.latencies.length > 10000) {
      this.metrics.urlCreation.latencies = this.metrics.urlCreation.latencies.slice(-5000);
    }
  }

  // Track database query time
  trackDatabaseQuery(queryTime) {
    this.metrics.database.totalQueries++;
    this.metrics.database.queryTimes.push(queryTime);

    // Keep only last 10000 query times
    if (this.metrics.database.queryTimes.length > 10000) {
      this.metrics.database.queryTimes = this.metrics.database.queryTimes.slice(-5000);
    }
  }

  // Track rate limiting
  trackRateLimitBlock() {
    this.metrics.rateLimiting.requestsBlocked++;
  }

  // Calculate statistics
  calculateStats(latencies) {
    if (latencies.length === 0) return null;

    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / latencies.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: latencies.length,
    };
  }

  // Get comprehensive report
  getReport() {
    const uptime = Date.now() - this.metrics.server.startTime;
    const uptimeSeconds = uptime / 1000;
    const uptimeMinutes = uptimeSeconds / 60;

    const redirectStats = this.calculateStats(this.metrics.redirects.latencies);
    const urlCreationStats = this.calculateStats(this.metrics.urlCreation.latencies);
    const dbQueryStats = this.calculateStats(this.metrics.database.queryTimes);

    const cacheHitRatio = this.metrics.redirects.total > 0
      ? ((this.metrics.redirects.cacheHits / this.metrics.redirects.total) * 100).toFixed(2)
      : 0;

    const avgRequestsPerMinute = this.metrics.server.requestsPerMinute.length > 0
      ? (this.metrics.server.requestsPerMinute.reduce((a, b) => a + b.count, 0) / this.metrics.server.requestsPerMinute.length).toFixed(2)
      : 0;

    const totalQPS = this.metrics.rateLimiting.totalRequests / uptimeSeconds;

    return {
      uptime: {
        milliseconds: uptime,
        seconds: uptimeSeconds.toFixed(2),
        minutes: uptimeMinutes.toFixed(2),
        hours: (uptimeMinutes / 60).toFixed(2),
      },
      performance: {
        redirect: {
          totalRedirects: this.metrics.redirects.total,
          cacheHits: this.metrics.redirects.cacheHits,
          cacheMisses: this.metrics.redirects.cacheMisses,
          cacheHitRatio: `${cacheHitRatio}%`,
          latency: redirectStats,
          errors: this.metrics.redirects.errorsCount,
          errorRate: this.metrics.redirects.total > 0
            ? ((this.metrics.redirects.errorsCount / this.metrics.redirects.total) * 100).toFixed(2) + '%'
            : '0%',
        },
        urlCreation: {
          total: this.metrics.urlCreation.total,
          latency: urlCreationStats,
          errors: this.metrics.urlCreation.errorsCount,
          errorRate: this.metrics.urlCreation.total > 0
            ? ((this.metrics.urlCreation.errorsCount / this.metrics.urlCreation.total) * 100).toFixed(2) + '%'
            : '0%',
        },
        database: {
          totalQueries: this.metrics.database.totalQueries,
          queryTime: dbQueryStats,
          queriesPerSecond: (this.metrics.database.totalQueries / uptimeSeconds).toFixed(2),
        },
      },
      loadHandling: {
        totalRequests: this.metrics.rateLimiting.totalRequests,
        requestsPerSecond: totalQPS.toFixed(2),
        avgRequestsPerMinute: avgRequestsPerMinute,
        peakConcurrentRequests: this.metrics.server.peakConcurrentRequests,
        currentConcurrentRequests: this.metrics.server.concurrentRequests,
        requestsPerMinuteHistory: this.metrics.server.requestsPerMinute,
      },
      rateLimiting: {
        totalRequests: this.metrics.rateLimiting.totalRequests,
        requestsBlocked: this.metrics.rateLimiting.requestsBlocked,
        blockRate: this.metrics.rateLimiting.totalRequests > 0
          ? Math.min(((this.metrics.rateLimiting.requestsBlocked / this.metrics.rateLimiting.totalRequests) * 100), 100).toFixed(2) + '%'
          : '0%',
        requestsPerMinute: avgRequestsPerMinute,
        limitPerMinute: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
      },
    };
  }

  // Export metrics to JSON file
  exportToFile(filename = 'metrics-report.json') {
    const report = this.getReport();
    const outputPath = path.join(__dirname, '../../', filename);

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Metrics exported to: ${outputPath}`);
    return outputPath;
  }

  // Get human-readable summary
  getSummary() {
    const report = this.getReport();

    return `
╔════════════════════════════════════════════════════════════════════════╗
║                    URL SHORTENER PERFORMANCE REPORT                    ║
╚════════════════════════════════════════════════════════════════════════╝

⏱️  UPTIME: ${report.uptime.minutes} minutes (${report.uptime.hours} hours)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 READ PERFORMANCE (Redirect Latency)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Redirects: ${report.performance.redirect.totalRedirects}
Cache Hit Ratio: ${report.performance.redirect.cacheHitRatio}
Cache Hits: ${report.performance.redirect.cacheHits}
Cache Misses: ${report.performance.redirect.cacheMisses}

Latency Stats (milliseconds):
  • Average: ${report.performance.redirect.latency?.avg.toFixed(2) || 'N/A'} ms
  • Median:  ${report.performance.redirect.latency?.median.toFixed(2) || 'N/A'} ms
  • P95:     ${report.performance.redirect.latency?.p95.toFixed(2) || 'N/A'} ms
  • P99:     ${report.performance.redirect.latency?.p99.toFixed(2) || 'N/A'} ms
  • Min:     ${report.performance.redirect.latency?.min.toFixed(2) || 'N/A'} ms
  • Max:     ${report.performance.redirect.latency?.max.toFixed(2) || 'N/A'} ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 LOAD HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Requests: ${report.loadHandling.totalRequests}
Requests Per Second (QPS): ${report.loadHandling.requestsPerSecond}
Avg Requests Per Minute: ${report.loadHandling.avgRequestsPerMinute}
Peak Concurrent Requests: ${report.loadHandling.peakConcurrentRequests}
Current Concurrent Requests: ${report.loadHandling.currentConcurrentRequests}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗄️  DATABASE OPTIMIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Queries: ${report.performance.database.totalQueries}
Queries Per Second: ${report.performance.database.queriesPerSecond}

Query Time Stats (milliseconds):
  • Average: ${report.performance.database.queryTime?.avg.toFixed(2) || 'N/A'} ms
  • Median:  ${report.performance.database.queryTime?.median.toFixed(2) || 'N/A'} ms
  • P95:     ${report.performance.database.queryTime?.p95.toFixed(2) || 'N/A'} ms
  • P99:     ${report.performance.database.queryTime?.p99.toFixed(2) || 'N/A'} ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛡️  RATE LIMITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Requests Processed: ${report.rateLimiting.totalRequests}
Requests Blocked: ${report.rateLimiting.requestsBlocked}
Block Rate: ${report.rateLimiting.blockRate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 RESUME-READY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ "Reduced redirect latency to ${report.performance.redirect.latency?.avg.toFixed(0) || 'XX'} ms average using Redis caching"

✅ "Achieved ${report.performance.redirect.cacheHitRatio} cache hit ratio under load"

✅ "Handled ${report.loadHandling.avgRequestsPerMinute}+ requests/minute with ${report.loadHandling.requestsPerSecond} QPS"

✅ "Optimized database queries to ${report.performance.database.queryTime?.avg.toFixed(0) || 'XX'} ms average execution time"

✅ "Implemented IP-based rate limiting protecting against ${report.rateLimiting.requestsBlocked} abuse attempts"

✅ "Maintained stable performance under ${report.loadHandling.peakConcurrentRequests} concurrent connections"

`;
  }

  // Reset metrics
  reset() {
    this.metrics = {
      redirects: {
        total: 0,
        cacheHits: 0,
        cacheMisses: 0,
        latencies: [],
        errorsCount: 0,
      },
      urlCreation: {
        total: 0,
        latencies: [],
        errorsCount: 0,
      },
      rateLimiting: {
        requestsBlocked: 0,
        totalRequests: 0,
      },
      database: {
        queryTimes: [],
        totalQueries: 0,
      },
      server: {
        startTime: Date.now(),
        requestsPerMinute: [],
        concurrentRequests: 0,
        peakConcurrentRequests: 0,
      },
    };
  }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

module.exports = { metricsCollector };

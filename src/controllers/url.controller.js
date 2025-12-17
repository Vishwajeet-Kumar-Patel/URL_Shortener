const URLModel = require('../models/url.model');
const { cache } = require('../config/redis');
const { trackSuspiciousUrl } = require('../middleware/rateLimiter');

class URLController {
  /**
   * Create a new short URL
   */
  static async createShortUrl(req, res) {
    try {
      const { url, expiresIn } = req.body;
      const ip = req.ip || req.connection.remoteAddress;

      // Check for suspicious URLs
      const isSuspicious = await trackSuspiciousUrl(ip, url);
      if (isSuspicious) {
        return res.status(400).json({
          error: 'URL rejected due to security concerns',
        });
      }

      // Check if URL already exists in cache or database
      const cacheKey = `url:${url}`;
      let existingUrl = await cache.get(cacheKey);

      if (!existingUrl) {
        existingUrl = await URLModel.findByOriginalUrl(url);
        if (existingUrl) {
          await cache.set(cacheKey, existingUrl);
        }
      }

      // Return existing URL if found
      if (existingUrl && !expiresIn) {
        return res.status(200).json({
          success: true,
          data: {
            shortUrl: `${process.env.BASE_URL}/${existingUrl.short_code}`,
            shortCode: existingUrl.short_code,
            originalUrl: existingUrl.original_url,
            existing: true,
          },
        });
      }

      // Create new short URL
      const newUrl = await URLModel.create(url, ip, expiresIn);

      // Cache the new URL
      await cache.set(`short:${newUrl.short_code}`, newUrl);
      await cache.set(cacheKey, newUrl);

      res.status(201).json({
        success: true,
        data: {
          shortUrl: `${process.env.BASE_URL}/${newUrl.short_code}`,
          shortCode: newUrl.short_code,
          originalUrl: newUrl.original_url,
          expiresAt: newUrl.expires_at,
          createdAt: newUrl.created_at,
        },
      });
    } catch (error) {
      console.error('Error creating short URL:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Redirect to original URL
   */
  static async redirectToOriginal(req, res) {
    try {
      const { shortCode } = req.params;

      // Try to get from cache first
      const cacheKey = `short:${shortCode}`;
      let url = await cache.get(cacheKey);

      if (!url) {
        // If not in cache, get from database
        url = await URLModel.findByShortCode(shortCode);

        if (!url) {
          return res.status(404).json({
            error: 'URL not found or expired',
          });
        }

        // Cache the result
        await cache.set(cacheKey, url);
      }

      // Record analytics asynchronously (don't wait)
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      const referer = req.get('referer');

      setImmediate(() => {
        URLModel.recordAnalytics(url.id, ip, userAgent, referer);
      });

      // Redirect to original URL
      res.redirect(301, url.original_url);
    } catch (error) {
      console.error('Error redirecting:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get URL analytics
   */
  static async getAnalytics(req, res) {
    try {
      const { shortCode } = req.params;

      const analytics = await URLModel.getAnalytics(shortCode);

      if (!analytics) {
        return res.status(404).json({
          error: 'URL not found',
        });
      }

      res.status(200).json({
        success: true,
        data: {
          shortCode: analytics.short_code,
          originalUrl: analytics.original_url,
          createdAt: analytics.created_at,
          clickCount: parseInt(analytics.click_count),
          totalClicks: parseInt(analytics.total_clicks),
          uniqueVisitors: parseInt(analytics.unique_visitors),
          lastAccessed: analytics.last_accessed,
        },
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Delete a short URL
   */
  static async deleteShortUrl(req, res) {
    try {
      const { shortCode } = req.params;

      const url = await URLModel.delete(shortCode);

      if (!url) {
        return res.status(404).json({
          error: 'URL not found',
        });
      }

      // Remove from cache
      await cache.del(`short:${shortCode}`);
      await cache.del(`url:${url.original_url}`);

      res.status(200).json({
        success: true,
        message: 'URL deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting URL:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  /**
   * Health check
   */
  static async healthCheck(req, res) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = URLController;

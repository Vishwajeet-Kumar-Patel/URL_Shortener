const { customAlphabet } = require('nanoid');
const db = require('../config/database');

// Custom alphabet for URL-safe short codes (avoids confusing characters)
const nanoid = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 7);

class URLModel {
  /**
   * Generate a unique short code with collision detection
   */
  static async generateUniqueShortCode(maxAttempts = 5) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const shortCode = nanoid();
      
      // Check if short code already exists
      const result = await db.query(
        'SELECT id FROM urls WHERE short_code = $1',
        [shortCode]
      );
      
      if (result.rows.length === 0) {
        return shortCode;
      }
    }
    
    // If collision persists, use a longer code
    const longerNanoid = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz', 10);
    return longerNanoid();
  }

  /**
   * Create a new short URL
   */
  static async create(originalUrl, creatorIp, expiresIn = null) {
    const shortCode = await this.generateUniqueShortCode();
    
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    const result = await db.query(
      `INSERT INTO urls (short_code, original_url, creator_ip, expires_at) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [shortCode, originalUrl, creatorIp, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Find URL by short code
   */
  static async findByShortCode(shortCode) {
    const result = await db.query(
      `SELECT * FROM urls 
       WHERE short_code = $1 
       AND is_active = TRUE 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [shortCode]
    );

    return result.rows[0];
  }

  /**
   * Find URL by original URL
   */
  static async findByOriginalUrl(originalUrl) {
    const result = await db.query(
      `SELECT * FROM urls 
       WHERE original_url = $1 
       AND is_active = TRUE 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
       ORDER BY created_at DESC
       LIMIT 1`,
      [originalUrl]
    );

    return result.rows[0];
  }

  /**
   * Update click count
   */
  static async incrementClickCount(id) {
    await db.query(
      `UPDATE urls 
       SET click_count = click_count + 1, 
           last_accessed = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * Record analytics
   */
  static async recordAnalytics(urlId, ipAddress, userAgent, referer) {
    await db.query(
      `INSERT INTO url_analytics (url_id, ip_address, user_agent, referer) 
       VALUES ($1, $2, $3, $4)`,
      [urlId, ipAddress, userAgent, referer]
    );
  }

  /**
   * Get analytics for a URL
   */
  static async getAnalytics(shortCode) {
    const result = await db.query(
      `SELECT 
        u.*,
        COUNT(a.id) as total_clicks,
        COUNT(DISTINCT a.ip_address) as unique_visitors
       FROM urls u
       LEFT JOIN url_analytics a ON u.id = a.url_id
       WHERE u.short_code = $1
       GROUP BY u.id`,
      [shortCode]
    );

    return result.rows[0];
  }

  /**
   * Get all URLs (paginated)
   */
  static async getAll(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT * FROM urls 
       WHERE is_active = TRUE 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Delete (soft delete) URL
   */
  static async delete(shortCode) {
    const result = await db.query(
      `UPDATE urls SET is_active = FALSE WHERE short_code = $1 RETURNING *`,
      [shortCode]
    );

    return result.rows[0];
  }
}

module.exports = URLModel;

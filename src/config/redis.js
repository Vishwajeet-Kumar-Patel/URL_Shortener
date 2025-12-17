const redis = require('redis');
require('dotenv').config();

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
  legacyMode: false,
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// Cache helper functions
const cache = {
  async get(key) {
    if (!process.env.CACHE_ENABLED || process.env.CACHE_ENABLED === 'false') {
      return null;
    }
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Cache get error:', err);
      return null;
    }
  },

  async set(key, value, ttl = parseInt(process.env.REDIS_TTL) || 86400) {
    if (!process.env.CACHE_ENABLED || process.env.CACHE_ENABLED === 'false') {
      return;
    }
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (err) {
      console.error('Cache set error:', err);
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error('Cache delete error:', err);
    }
  },

  async increment(key, ttl = 900) {
    try {
      const value = await redisClient.incr(key);
      if (value === 1) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (err) {
      console.error('Cache increment error:', err);
      return 0;
    }
  },

  async exists(key) {
    try {
      return await redisClient.exists(key);
    } catch (err) {
      console.error('Cache exists error:', err);
      return false;
    }
  },
};

module.exports = { redisClient, cache };

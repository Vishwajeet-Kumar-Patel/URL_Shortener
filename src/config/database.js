const { Pool } = require('pg');
const { performance } = require('perf_hooks');
require('dotenv').config();

// Import metrics collector if available
let metricsCollector;
try {
  metricsCollector = require('../middleware/metricsCollector').metricsCollector;
} catch (e) {
  // Metrics collector not available
}

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'url_shortener',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Connection test
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Wrapper to track query performance
const queryWithMetrics = async (text, params) => {
  const startTime = performance.now();
  try {
    const result = await pool.query(text, params);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Track query time if metrics collector is available
    if (metricsCollector) {
      metricsCollector.trackDatabaseQuery(duration);
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (metricsCollector) {
      metricsCollector.trackDatabaseQuery(duration);
    }
    
    throw error;
  }
};

module.exports = {
  query: queryWithMetrics,
  pool,
};

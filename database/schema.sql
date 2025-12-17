-- Database is created by Docker automatically
-- No need to create or connect

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- URLs table with proper indexing for collision-safe generation
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    click_count BIGINT DEFAULT 0,
    last_accessed TIMESTAMP,
    creator_ip VARCHAR(45),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for fast lookups
CREATE INDEX idx_short_code ON urls(short_code) WHERE is_active = TRUE;
CREATE INDEX idx_original_url ON urls(original_url);
CREATE INDEX idx_created_at ON urls(created_at DESC);
CREATE INDEX idx_expires_at ON urls(expires_at) WHERE expires_at IS NOT NULL;

-- Analytics table for tracking clicks
CREATE TABLE url_analytics (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT REFERENCES urls(id) ON DELETE CASCADE,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    city VARCHAR(100)
);

-- Index for analytics queries
CREATE INDEX idx_url_analytics_url_id ON url_analytics(url_id);
CREATE INDEX idx_url_analytics_accessed_at ON url_analytics(accessed_at DESC);

-- Rate limiting table
CREATE TABLE rate_limits (
    id BIGSERIAL PRIMARY KEY,
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    request_count INTEGER DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP
);

CREATE INDEX idx_rate_limits_ip ON rate_limits(ip_address);

-- Function to update click count
CREATE OR REPLACE FUNCTION increment_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE urls 
    SET click_count = click_count + 1,
        last_accessed = NEW.accessed_at
    WHERE id = NEW.url_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment click count
CREATE TRIGGER update_click_count
AFTER INSERT ON url_analytics
FOR EACH ROW
EXECUTE FUNCTION increment_click_count();

-- Function to clean expired URLs
CREATE OR REPLACE FUNCTION clean_expired_urls()
RETURNS void AS $$
BEGIN
    UPDATE urls 
    SET is_active = FALSE 
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP 
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

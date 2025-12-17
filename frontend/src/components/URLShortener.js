import React, { useState } from 'react';
import axios from 'axios';
import { FaLink, FaCopy, FaCheck, FaSpinner } from 'react-icons/fa';
import './URLShortener.css';

const URLShortener = () => {
  const [url, setUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShortUrl('');
    setLoading(true);

    try {
      const payload = { url };
      if (expiresIn) {
        payload.expiresIn = parseInt(expiresIn);
      }

      const response = await axios.post('/api/shorten', payload);
      setShortUrl(response.data.data.shortUrl);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.details?.[0]?.msg ||
          'Failed to shorten URL'
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="url-shortener">
      <div className="card">
        <h2>Shorten Your URL</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Enter URL</label>
            <div className="input-with-icon">
              <FaLink className="input-icon" />
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/very-long-url"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expiresIn">Expiration (optional)</label>
            <select
              id="expiresIn"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              <option value="">Never</option>
              <option value="3600">1 Hour</option>
              <option value="86400">1 Day</option>
              <option value="604800">1 Week</option>
              <option value="2592000">30 Days</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Shortening...
              </>
            ) : (
              <>
                <FaLink /> Shorten URL
              </>
            )}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {shortUrl && (
          <div className="result">
            <h3>Your shortened URL:</h3>
            <div className="short-url-display">
              <input type="text" value={shortUrl} readOnly />
              <button
                className="btn-copy"
                onClick={copyToClipboard}
                title="Copy to clipboard"
              >
                {copied ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
            <p className="success-message">
              {copied ? 'Copied!' : 'Click to copy'}
            </p>
          </div>
        )}

        <div className="features">
          <div className="feature">
            <h4>⚡ Fast Redirects</h4>
            <p>Redis caching for instant redirects</p>
          </div>
          <div className="feature">
            <h4>🔒 Secure</h4>
            <p>Abuse prevention & rate limiting</p>
          </div>
          <div className="feature">
            <h4>📊 Analytics</h4>
            <p>Track clicks and visitors</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default URLShortener;

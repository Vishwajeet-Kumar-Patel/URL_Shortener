import React, { useState } from 'react';
import axios from 'axios';
import { FaSearch, FaSpinner } from 'react-icons/fa';
import './Analytics.css';

const Analytics = () => {
  const [shortCode, setShortCode] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAnalytics(null);
    setLoading(true);

    try {
      const response = await axios.get(`/api/analytics/${shortCode}`);
      setAnalytics(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analytics">
      <div className="card">
        <h2>URL Analytics</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shortCode">Enter Short Code</label>
            <div className="input-with-icon">
              <FaSearch className="input-icon" />
              <input
                type="text"
                id="shortCode"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value)}
                placeholder="e.g., abc1234"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <FaSpinner className="spinner" /> Loading...
              </>
            ) : (
              <>
                <FaSearch /> Get Analytics
              </>
            )}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        {analytics && (
          <div className="analytics-result">
            <h3>Analytics Overview</h3>

            <div className="analytics-grid">
              <div className="stat-card">
                <div className="stat-value">{analytics.clickCount}</div>
                <div className="stat-label">Total Clicks</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">{analytics.uniqueVisitors}</div>
                <div className="stat-label">Unique Visitors</div>
              </div>
            </div>

            <div className="url-info">
              <div className="info-row">
                <span className="info-label">Short Code:</span>
                <span className="info-value">{analytics.shortCode}</span>
              </div>

              <div className="info-row">
                <span className="info-label">Original URL:</span>
                <span className="info-value url-link">
                  <a
                    href={analytics.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {analytics.originalUrl}
                  </a>
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {new Date(analytics.createdAt).toLocaleString()}
                </span>
              </div>

              {analytics.lastAccessed && (
                <div className="info-row">
                  <span className="info-label">Last Accessed:</span>
                  <span className="info-value">
                    {new Date(analytics.lastAccessed).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;

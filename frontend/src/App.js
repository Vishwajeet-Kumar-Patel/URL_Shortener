import React, { useState } from 'react';
import './App.css';
import URLShortener from './components/URLShortener';
import Analytics from './components/Analytics';
import { FaLink, FaChartBar, FaGithub } from 'react-icons/fa';

function App() {
  const [activeTab, setActiveTab] = useState('shorten');

  return (
    <div className="App">
      <header className="App-header">
        <div className="logo">
          <FaLink className="logo-icon" />
          <h1>URL Shortener</h1>
        </div>
        <p className="subtitle">Fast, Scalable, Redis-Powered</p>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'shorten' ? 'active' : ''}`}
          onClick={() => setActiveTab('shorten')}
        >
          <FaLink /> Shorten URL
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <FaChartBar /> Analytics
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'shorten' ? <URLShortener /> : <Analytics />}
      </main>

      <footer className="App-footer">
        <p>
          Built with Node.js, PostgreSQL, Redis, and React
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <FaGithub />
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;

import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    return [
      // Proxy legacy redirect routes to the API service inside Docker
      { source: '/r/:path*', destination: 'http://api:5000/r/:path*' },
      // Catch likely short-slug patterns (alphanumeric/underscore/dash) and proxy to API
      { source: '/:slug([A-Za-z0-9_-]{4,})', destination: 'http://api:5000/:slug' }
    ];
  },
};

export default nextConfig;

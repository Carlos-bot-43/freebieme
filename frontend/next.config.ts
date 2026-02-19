import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Silence "multiple lockfiles" turbopack warning.
  // The repo has both /package-lock.json (scraper) and /frontend/package-lock.json.
  // Pinning root to frontend/ tells Next.js exactly where its workspace is.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

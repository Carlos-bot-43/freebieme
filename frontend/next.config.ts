import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Set tracing root to repo root (parent of frontend/).
  // This lets outputFileTracingExcludes reference data/ which lives at repo root.
  outputFileTracingRoot: path.join(__dirname, ".."),

  // Exclude the large deal/location data files from serverless function bundles.
  // These files are only read at BUILD TIME for SSG — the pre-rendered HTML
  // is what gets served. Runtime functions don't need them.
  outputFileTracingExcludes: {
    "*": [
      "data/output/deals/**/*",
      "data/output/locations/**/*",
      "data/output/chains/**/*",
    ],
  },

  // Silence the turbopack root warning (we set outputFileTracingRoot above).
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;

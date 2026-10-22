import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // The end-to-end runner (tests/run.mjs) builds into separate folders.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

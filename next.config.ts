import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next 16.1+ enables Turbopack's persistent dev filesystem cache by
    // default, storing compiled output in `.next/cache` across restarts.
    // We hit a bug where a CSS-only edit didn't invalidate that cache, so
    // the browser kept getting served a stale chunk even after restarting
    // `next dev` (only deleting `.next` fixed it). Disabling it trades a
    // little rebuild speed for always serving what's actually on disk.
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;

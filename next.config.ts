import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Builder-uploaded media is served via kkl-backend, never fetched from arbitrary origins.
  // Remote patterns stay empty until the backend media host is fixed.
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;

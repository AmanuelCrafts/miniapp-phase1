import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.telegram.org" },
      { protocol: "https", hostname: "cdn-telegram.org" },
      { protocol: "https", hostname: "**.telesco.pe" },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from 'next';

/**
 * The Mini App is a public Telegram web page, so the only secret on this side
 * is the API origin. Never add a TELEGRAM_BOT_TOKEN (or any other secret) here -
 * it would be inlined into the JavaScript bundle.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Next.js 16 writes AGENTS.md / CLAUDE.md into the project on `next dev`.
  // They are regenerated on every run, so they are either committed as noise or
  // suppressed here to keep the working tree matching the documented layout.
  agentRules: false,
  turbopack: false as any,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

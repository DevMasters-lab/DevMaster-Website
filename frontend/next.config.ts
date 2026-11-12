import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { laravelPaths, privateLaravelPaths, privateResponseHeaders } from './src/lib/laravel-proxy';

const backendUrl = new URL(process.env.LARAVEL_URL || (process.env.VERCEL ? 'https://devmasters-api.onrender.com' : 'http://127.0.0.1:8081'));
if (!['http:', 'https:'].includes(backendUrl.protocol) || backendUrl.username || backendUrl.password || backendUrl.pathname !== '/' || backendUrl.search || backendUrl.hash) {
  throw new Error('LARAVEL_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
}
if (process.env.VERCEL && (backendUrl.protocol !== 'https:' || /^(?:localhost|.*\.localhost|127\..*|0\.0\.0\.0|\[::1\])$/.test(backendUrl.hostname))) {
  throw new Error('LARAVEL_URL on Vercel must be a public HTTPS origin, such as https://devmasters-api.onrender.com.');
}
const backend = backendUrl.origin;
const config: NextConfig = {
  devIndicators: false,
  // Match Laravel's post_max_size, including forms with five 10 MiB attachments.
  experimental: { proxyClientMaxBodySize: '64mb' },
  async rewrites() {
    return {
      beforeFiles: laravelPaths.map(source => ({ source, destination: `${backend}${source}` })),
    };
  },
  async headers() {
    return [
      { source: '/fonts/:font.ttf', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      ...privateLaravelPaths.map(source => ({ source, headers: privateResponseHeaders })),
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
const backend = process.env.LARAVEL_URL || 'http://127.0.0.1:8081';
const config: NextConfig = {
  devIndicators: false,
  async rewrites() { return ['locale','api/:path*','sanctum/:path*','admin/:path*','livewire/:path*','livewire-:hash/:path*','css/filament/:path*','js/filament/:path*','fonts/filament/:path*'].map(path=>({source:`/${path}`,destination:`${backend}/${path}`})); },
  async headers() { return [{source:'/fonts/:font.ttf',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}]}]; },
};
export default createNextIntlPlugin('./src/i18n/request.ts')(config);

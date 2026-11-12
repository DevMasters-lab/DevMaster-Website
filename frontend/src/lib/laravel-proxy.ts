// Reserve only Laravel's route namespaces. Public Next.js pages and assets stay local.
export const privateLaravelPaths = [
  '/admin/:path*',
  '/api/:path*',
  '/sanctum/:path*',
  '/locale',
  '/livewire/:path*',
  '/livewire-:hash/:path*',
  '/filament/exports/:path*',
  '/filament/imports/:path*',
  '/storage/:path*',
];

export const laravelPaths = [
  ...privateLaravelPaths,
  '/css/filament/:path*',
  '/js/filament/:path*',
  '/fonts/filament/:path*',
];

export const privateResponseHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
  { key: 'CDN-Cache-Control', value: 'no-store' },
  { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
  { key: 'x-vercel-enable-rewrite-caching', value: '0' },
];

export function isLaravelPath(path: string): boolean {
  return /^\/(?:admin|api|sanctum|livewire|storage)(?:\/|$)/.test(path)
    || /^\/livewire-[^/]+(?:\/|$)/.test(path)
    || path === '/locale'
    || /^\/filament\/(?:exports|imports)(?:\/|$)/.test(path)
    || /^\/(?:css|js|fonts)\/filament(?:\/|$)/.test(path);
}

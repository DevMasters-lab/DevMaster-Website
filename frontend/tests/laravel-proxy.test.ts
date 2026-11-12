// @vitest-environment node
import { afterAll, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getRewrittenUrl, unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';
import nextConfig from '../next.config';
import { proxy } from '../src/proxy';

const origin = 'https://devmasters.dev';
const backend = 'https://laravel-origin.example';
vi.hoisted(() => vi.stubEnv('LARAVEL_URL', 'https://laravel-origin.example'));
afterAll(() => vi.unstubAllEnvs());

describe('Laravel reverse proxy', () => {
  it.each([
    '/admin', '/admin/login', '/admin/logout', '/admin/password-reset/request',
    '/api', '/api/health', '/api/v1/auth/login', '/api/v1/auth/logout',
    '/sanctum/csrf-cookie', '/locale', '/livewire/update', '/livewire/livewire.js',
    '/livewire-1234abcd/upload-file', '/livewire-1234abcd/preview-file/example.jpg',
    '/livewire-1234abcd/js/component.js', '/css/filament/filament/app.css',
    '/js/filament/filament/app.js', '/fonts/filament/filament/inter/latin.woff2',
    '/filament/exports/1/download', '/filament/imports/1/failed-rows/download',
    '/storage/photo.jpg', '/storage/extensionless-file',
  ])('proxies %s with query strings and an explicit public origin', async path => {
    const url = `${origin}${path}?signature=example&expires=123`;
    const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
    expect(getRewrittenUrl(response)).toBe(`${backend}${path}?signature=example&expires=123`);

    const request = new NextRequest(url, {
      headers: { 'X-Devmasters-Proxy-Host': 'attacker.example', 'X-Devmasters-Proxy-Proto': 'http' },
    });
    const forwarded = proxy(request);
    expect(forwarded.headers.get('location')).toBeNull();
    expect(forwarded.headers.get('x-middleware-rewrite')).toBeNull();
    expect(forwarded.headers.get('x-middleware-request-x-devmasters-proxy-host')).toBe('devmasters.dev');
    expect(forwarded.headers.get('x-middleware-request-x-devmasters-proxy-proto')).toBe('https');
  });

  it.each(['/admin', '/api/v1/auth/me', '/sanctum/csrf-cookie', '/locale', '/livewire/update', '/livewire-1234abcd/preview-file/example.jpg', '/filament/exports/1/download', '/storage/private-name'])('disables shared caching for %s', async path => {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}${path}`, nextConfig });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('cdn-cache-control')).toBe('no-store');
    expect(response.headers.get('vercel-cdn-cache-control')).toBe('no-store');
    expect(response.headers.get('x-vercel-enable-rewrite-caching')).toBe('0');
  });

  it.each(['/', '/login', '/logout', '/expert/profile', '/en/login', '/km/hire-our-team', '/administrator', '/apiary', '/filament/gallery', '/_next/static/app.js', '/Logo.jpg', '/fonts/devmasters.css', '/fonts/Inter.ttf'])('keeps Next.js path %s out of Laravel', async path => {
    const response = await unstable_getResponseFromNextConfig({ url: `${origin}${path}`, nextConfig });
    expect(getRewrittenUrl(response)).toBeNull();
  });

  it('preserves localization, frontend assets and security headers', async () => {
    const login = proxy(new NextRequest(`${origin}/login`));
    expect(login.headers.get('location')).toBe(`${origin}/km/login`);
    const localized = proxy(new NextRequest(`${origin}/en/login`));
    expect(localized.headers.get('x-middleware-rewrite')).toBe(`${origin}/login`);
    expect(localized.headers.get('set-cookie')).toContain('devmasters_locale=en');

    const font = proxy(new NextRequest(`${origin}/fonts/Inter.ttf`));
    expect(font.headers.get('location')).toBeNull();
    const fontConfig = await unstable_getResponseFromNextConfig({ url: `${origin}/fonts/Inter.ttf`, nextConfig });
    expect(fontConfig.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(fontConfig.headers.get('x-content-type-options')).toBe('nosniff');
    expect(fontConfig.headers.get('x-frame-options')).toBe('SAMEORIGIN');
  });

  it('uses the inbound authority when Next.js normalizes a local hostname', () => {
    const request = new NextRequest('http://localhost:13001/admin', { headers: { host: '127.0.0.1:13001' } });
    expect(proxy(request).headers.get('x-middleware-request-x-devmasters-proxy-host')).toBe('127.0.0.1:13001');
    const frontend = new NextRequest('http://localhost:13001/en/home', { headers: { host: '127.0.0.1:13001' } });
    expect(proxy(frontend).headers.get('x-middleware-rewrite')).toBe('http://127.0.0.1:13001/home');
    const redirect = new NextRequest('http://localhost:13001/home', { headers: { host: '127.0.0.1:13001' } });
    expect(proxy(redirect).headers.get('location')).toBe('http://127.0.0.1:13001/km/home');
  });

  it.each(['en', 'km'])('redirects the removed About page to /%s/home', locale => {
    const response = proxy(new NextRequest(`${origin}/${locale}/about?source=bookmark`));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(`${origin}/${locale}/home?source=bookmark`);

    const home = proxy(new NextRequest(`${origin}/${locale}/home`));
    expect(home.headers.get('location')).toBeNull();
    expect(home.headers.get('x-middleware-rewrite')).toBe(`${origin}/home`);
  });

  it('uses the saved language when redirecting an unprefixed About URL', () => {
    const response = proxy(new NextRequest(`${origin}/about`, {
      headers: { cookie: 'devmasters_locale=en' },
    }));
    expect(response.headers.get('location')).toBe(`${origin}/en/home`);
  });
});

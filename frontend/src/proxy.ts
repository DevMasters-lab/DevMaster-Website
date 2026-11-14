import { NextRequest, NextResponse } from 'next/server';
import { supported, stripLocale, localePath } from './i18n/config';
import { isLaravelPath } from './lib/laravel-proxy';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (isLaravelPath(path)) {
    const headers = new Headers(request.headers);
    // Render can replace standard forwarding headers. Laravel validates these
    // values against the configured public origin before using them.
    headers.set('X-Devmasters-Proxy-Host', request.headers.get('host') || request.nextUrl.host);
    headers.set('X-Devmasters-Proxy-Proto', request.nextUrl.protocol.replace(':', ''));
    return NextResponse.next({ request: { headers } });
  }

  const segment = path.split('/')[1];
  const cookie = request.cookies.get('devmasters_locale')?.value;
  const locale = supported(segment) ? segment : supported(cookie) ? cookie : 'km';
  const normalized = stripLocale(path);

  if (['/application-corrections', '/expert', '/technology-skills'].some(route => normalized === route || normalized.startsWith(route + '/'))) {
    const url = new URL(request.nextUrl.href);
    url.host = request.headers.get('host') || url.host;
    url.pathname = localePath('/home', locale);
    url.search = '';
    url.hash = '';
    const response = NextResponse.redirect(url, 308);
    response.headers.set('Referrer-Policy', 'no-referrer');
    return response;
  }

  if (path.startsWith('/_next/') || path.includes('.') || /^\/(?:css|js|fonts)(?:\/|$)/.test(path)) {
    return NextResponse.next();
  }

  if (normalized === '/about') {
    const url = new URL(request.nextUrl.href);
    url.host = request.headers.get('host') || url.host;
    url.pathname = localePath('/home', locale);
    return NextResponse.redirect(url, 308);
  }

  if (!supported(segment) && supported(request.headers.get('x-devmasters-locale'))) {
    return NextResponse.next();
  }

  if (!supported(segment)) {
    const url = new URL(request.nextUrl.href);
    url.host = request.headers.get('host') || url.host;
    url.pathname = '/' + locale + (path === '/' ? '' : path);
    return NextResponse.redirect(url);
  }

  const url = new URL(request.nextUrl.href);
  // Keep the inbound authority: localhost may resolve to another local app.
  url.host = request.headers.get('host') || url.host;
  url.pathname = stripLocale(path);
  const headers = new Headers(request.headers);
  headers.set('x-devmasters-locale', locale);
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set('devmasters_locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };

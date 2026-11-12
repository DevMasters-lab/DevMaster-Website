import { NextRequest, NextResponse } from 'next/server';
import { supported, stripLocale } from './i18n/config';
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

  if (path.startsWith('/_next/') || path.includes('.') || /^\/(?:css|js|fonts)(?:\/|$)/.test(path)) {
    return NextResponse.next();
  }

  const segment = path.split('/')[1];
  const cookie = request.cookies.get('devmasters_locale')?.value;
  const locale = supported(segment) ? segment : supported(cookie) ? cookie : 'km';

  if (!supported(segment) && supported(request.headers.get('x-devmasters-locale'))) {
    return NextResponse.next();
  }

  if (!supported(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + locale + (path === '/' ? '' : path);
    return NextResponse.redirect(url);
  }

  const url = request.nextUrl.clone();
  url.pathname = stripLocale(path);
  const headers = new Headers(request.headers);
  headers.set('x-devmasters-locale', locale);
  const response = NextResponse.rewrite(url, { request: { headers } });
  response.cookies.set('devmasters_locale', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };

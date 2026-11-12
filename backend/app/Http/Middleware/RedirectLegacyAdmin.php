<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectLegacyAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $originHost = strtolower((string) parse_url('https://'.$request->header('Host'), PHP_URL_HOST));
        $effectiveHost = $request->getHost();
        $isLegacyOrigin = $originHost === 'devmasters-api.onrender.com' && $effectiveHost === 'devmasters-api.onrender.com';
        $isPublicLogin = $effectiveHost === 'devmasters.dev' && $request->is('admin/login');

        if (! in_array($request->method(), ['GET', 'HEAD'], true)
            || (! $isLegacyOrigin && ! $isPublicLogin)
            || ! $request->is('/', 'admin', 'admin/login')) {
            return $next($request);
        }

        $query = $this->safeQuery($request);
        $path = $request->is('/', 'admin/login') ? 'admin' : $request->path();

        return redirect()->away('https://devmasters.dev/'.$path.($query === '' ? '' : '?'.$query))
            ->header('Cache-Control', 'private, no-store')
            ->header('CDN-Cache-Control', 'no-store')
            ->header('Vercel-CDN-Cache-Control', 'no-store')
            ->header('Referrer-Policy', 'no-referrer');
    }

    private function safeQuery(Request $request): string
    {
        $query = [];

        /** Only bounded scalar context crosses hosts; credentials and return URLs stay on the origin. */
        foreach (array_slice($request->query(), 0, 20, true) as $key => $value) {
            if (! is_string($key) || ! is_string($value) || strlen($key) > 64 || strlen($value) > 256
                || preg_match('/[\x00-\x1F\x7F]/', $key.$value)
                || preg_match('/token|secret|password|passwd|credential|session|cookie|email|signature|auth|mfa|otp|code|csrf|xsrf|redirect|return|next|url|continue|state|key|remember/i', $key)) {
                continue;
            }

            $query[$key] = $value;
        }

        return http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }
}

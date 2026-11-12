<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PreventPublicCaching
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        return self::apply($request, $next($request));
    }

    public static function apply(Request $request, Response $response): Response
    {
        if ($request->is('admin', 'admin/*', 'api', 'api/*', 'sanctum/*', 'locale', 'livewire/*', 'livewire-*/*', 'filament/*')) {
            $response->headers->set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate');
            $response->headers->set('CDN-Cache-Control', 'no-store');
            $response->headers->set('Vercel-CDN-Cache-Control', 'no-store');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }
}

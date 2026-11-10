<?php

namespace App\Http\Middleware;

use App\Support\Localization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $explicit = $request->header('X-Locale');
        $cookie = $request->cookie('devmasters_locale');
        $preference = $request->user('web')?->preferred_locale;
        $locale = Localization::valid($explicit) ? $explicit : (Localization::valid($preference) ? $preference : (Localization::valid($cookie) ? $cookie : ($request->hasHeader('Accept-Language') ? $request->getPreferredLanguage(['km', 'en']) : config('app.locale', 'km'))));
        $locale = Localization::valid($locale) ? $locale : config('app.locale', 'km');
        app()->setLocale($locale);
        $request->attributes->set('resolved_locale', $locale);
        $response = $next($request);
        $response->headers->set('Content-Language', $locale);
        $response->headers->set('Vary', trim($response->headers->get('Vary', '').', Cookie, Accept-Language, X-Locale', ', '));

        return $response;
    }
}

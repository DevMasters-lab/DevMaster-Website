<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrustFrontendProxies extends TrustProxies
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origins = $this->configuredOrigins();
        $forwardedHost = strtolower((string) $request->header('X-Forwarded-Host'));

        if (! isset($origins[$forwardedHost])) {
            $request->headers->remove('X-Forwarded-Host');
        }

        return parent::handle($request, function (Request $request) use ($next, $origins): Response {
            $host = strtolower((string) $request->header('X-Devmasters-Proxy-Host'));
            $scheme = strtolower((string) $request->header('X-Devmasters-Proxy-Proto'));

            /** Preserve the browser origin even when an upstream proxy replaces X-Forwarded-Host. */
            if ($request->isFromTrustedProxy() && isset($origins[$host]) && $scheme === $origins[$host]['scheme']) {
                $request->headers->set('X-Forwarded-Host', $host);
                $request->headers->set('X-Forwarded-Proto', $scheme);
                $request->headers->set('X-Forwarded-Port', (string) $origins[$host]['port']);
            }

            return $next($request);
        });
    }

    /** @return array<string, array{scheme: string, port: int}> */
    private function configuredOrigins(): array
    {
        $origins = [];

        foreach ([config('app.url'), config('devmasters.frontend_url')] as $url) {
            $parts = parse_url((string) $url);
            if (! is_array($parts) || ! isset($parts['host'], $parts['scheme']) || ! in_array($parts['scheme'], ['http', 'https'], true)) {
                continue;
            }

            $host = strtolower($parts['host']).(isset($parts['port']) ? ':'.$parts['port'] : '');
            $origins[$host] = ['scheme' => $parts['scheme'], 'port' => $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80)];
        }

        return $origins;
    }
}

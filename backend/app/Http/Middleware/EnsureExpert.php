<?php

namespace App\Http\Middleware;

use Closure;

class EnsureExpert
{
    public function handle($request, Closure $next)
    {
        abort_unless($request->user()?->isEligibleExpert(), 403, 'Approved and activated expert access is required.');

        return $next($request);
    }
}

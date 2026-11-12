<?php

namespace App\Http\Middleware;

use Closure;
use Filament\Auth\Pages\Login;
use Filament\Facades\Filament;
use Illuminate\Http\Request;
use Illuminate\Routing\Pipeline;
use Illuminate\Routing\Router;
use Livewire\Component;
use Livewire\Mechanisms\HandleComponents\ComponentContext;
use Symfony\Component\HttpFoundation\Response;

use function Livewire\after;

class RenderAdminLogin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('filament.admin.pages.dashboard') || Filament::auth()->check()) {
            return $next($request);
        }

        $panel = Filament::getCurrentPanel();
        $loginPath = trim($panel->getPath().$panel->getLoginRouteSlug(), '/');
        $router = app(Router::class);
        $dashboardMiddleware = $router->gatherRouteMiddleware($request->route());
        $appliedMiddleware = array_slice($dashboardMiddleware, 0, array_search(self::class, $dashboardMiddleware, true) + 1);
        $loginMiddleware = array_values(array_diff(
            $router->gatherRouteMiddleware($router->getRoutes()->getByName('filament.admin.auth.login')),
            $appliedMiddleware,
        ));

        /** Keep guest Livewire updates on the native login route; dashboard snapshots retain their authentication middleware. */
        $removeListener = after('dehydrate', function (Component $component, ComponentContext $context) use ($loginPath): void {
            $context->addMemo('path', $loginPath);
        });

        try {
            return app(Pipeline::class)->send($request)->through($loginMiddleware)
                ->then(fn (): Response => app(Login::class)());
        } finally {
            $removeListener();
        }
    }
}

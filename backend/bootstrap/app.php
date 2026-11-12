<?php

use App\Http\Middleware\EnsureExpert;
use App\Http\Middleware\PreventPublicCaching;
use App\Http\Middleware\ResolveLocale;
use App\Http\Middleware\TrustFrontendProxies;
use App\Support\Localization;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PORT | Request::HEADER_X_FORWARDED_PROTO);
        $middleware->replace(TrustProxies::class, TrustFrontendProxies::class);
        $middleware->prepend(PreventPublicCaching::class);
        $middleware->redirectGuestsTo(fn (Request $request): string => route('filament.admin.auth.login'));
        $middleware->encryptCookies(except: ['devmasters_locale']);
        $middleware->appendToGroup('web', ResolveLocale::class);
        $middleware->alias(['expert' => EnsureExpert::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(fn (Response $response): Response => PreventPublicCaching::apply(request(), $response));
        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }
            $validation = $exception instanceof ValidationException;
            $status = $validation ? 422 : ($exception instanceof AuthenticationException ? 401 : ($exception instanceof AuthorizationException ? 403 : ($exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500)));
            $source = $validation ? 'The given data was invalid.' : match ($status) {
                401 => 'Unauthenticated.',
                404 => 'Not found.',
                419 => 'Your session has expired. Please refresh.',
                429 => 'Too many requests. Please try again shortly.',
                default => $status >= 500 ? 'An unexpected error occurred.' : ($exception->getMessage() ?: ($status === 403 ? 'This action is unauthorized.' : 'The request could not be completed.')),
            };
            $code = $validation ? 'VALIDATION_FAILED' : match ($status) {
                401 => 'UNAUTHENTICATED',403 => 'FORBIDDEN',404 => 'NOT_FOUND',419 => 'CSRF_EXPIRED',429 => 'RATE_LIMITED',500 => 'INTERNAL_ERROR',default => 'ERROR_'.strtoupper(substr(hash('sha256', $source), 0, 12))
            };
            $message = Localization::text($source);
            $body = ['message' => $message, 'code' => $code, 'locale' => app()->getLocale()];
            if ($validation) {
                $body['errors'] = $exception->errors();
            }

            return response()->json($body, $status);
        });
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

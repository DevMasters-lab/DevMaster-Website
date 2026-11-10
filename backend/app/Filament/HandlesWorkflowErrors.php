<?php

namespace App\Filament;

use App\Support\Localization;
use Filament\Notifications\Notification;
use Illuminate\Auth\Access\AuthorizationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

trait HandlesWorkflowErrors
{
    public function exceptionHandlesWorkflowErrors(Throwable $e, callable $stopPropagation): void
    {
        if ($e instanceof AuthorizationException) {
            Notification::make()->title(__('Access denied'))->body(__('Your account is not authorized for this action.'))->danger()->send();
            $stopPropagation();
        } elseif ($e instanceof HttpExceptionInterface && in_array($e->getStatusCode(), [403, 409, 422], true)) {
            Notification::make()->title($e->getStatusCode() === 409 ? __('Refresh and try again') : __('Action unavailable'))->body(Localization::text($e->getMessage()))->danger()->send();
            $stopPropagation();
        }
    }
}

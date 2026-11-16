<?php

namespace App\Filament\Pages;

use App\Services\AccessManagementService;
use DanHarrin\LivewireRateLimiting\Exceptions\TooManyRequestsException;
use Filament\Auth\Pages\PasswordReset\RequestPasswordReset as BaseRequestPasswordReset;
use Filament\Support\Components\Attributes\Exposed;
use Illuminate\Support\Facades\Password;

class RequestPasswordReset extends BaseRequestPasswordReset
{
    #[Exposed]
    public function request(): void
    {
        try {
            $this->rateLimit(2);
        } catch (TooManyRequestsException $exception) {
            $this->getRateLimitedNotification($exception)?->send();

            return;
        }

        $data = $this->form->getState();
        app(AccessManagementService::class)->sendPasswordResetLink($data['email'], staffOnly: true);
        $this->getSentNotification(Password::RESET_LINK_SENT)?->send();
        $this->form->fill();
    }
}

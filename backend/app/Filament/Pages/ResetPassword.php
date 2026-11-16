<?php

namespace App\Filament\Pages;

use App\Models\User;
use App\Services\AccessManagementService;
use DanHarrin\LivewireRateLimiting\Exceptions\TooManyRequestsException;
use Filament\Auth\Http\Responses\Contracts\PasswordResetResponse;
use Filament\Auth\Pages\PasswordReset\ResetPassword as BaseResetPassword;
use Filament\Facades\Filament;
use Filament\Notifications\Notification;
use Filament\Schemas\Components\Component;
use Filament\Support\Components\Attributes\Exposed;
use Illuminate\Auth\Events\PasswordReset as PasswordResetEvent;
use Illuminate\Support\Facades\Password;

class ResetPassword extends BaseResetPassword
{
    #[Exposed]
    public function resetPassword(): ?PasswordResetResponse
    {
        try {
            $this->rateLimit(2);
        } catch (TooManyRequestsException $exception) {
            $this->getRateLimitedNotification($exception)?->send();

            return null;
        }
        if ($this->isResetPasswordRateLimited($this->email)) {
            return null;
        }

        $data = $this->form->getState();
        $data['email'] = $this->email;
        $data['token'] = $this->token;
        $hasPanelAccess = true;
        $status = Password::broker(Filament::getAuthPasswordBroker())->reset(
            $this->getCredentialsFromFormData($data),
            function (User $user, string $password) use (&$hasPanelAccess): void {
                if (! $user->hasPermissionTo('admin.access') || ! in_array($user->status, ['INVITED', 'ACTIVE'])) {
                    $hasPanelAccess = false;

                    return;
                }

                app(AccessManagementService::class)->resetPassword($user, $password);
                event(new PasswordResetEvent($user->refresh()));
            },
        );
        if (! $hasPanelAccess) {
            $status = Password::INVALID_USER;
        }

        $notification = Notification::make()->title(__($status));
        if ($status !== Password::PASSWORD_RESET) {
            $notification->danger()->send();

            return null;
        }
        $notification->success()->send();

        return app(PasswordResetResponse::class);
    }

    protected function getPasswordFormComponent(): Component
    {
        return parent::getPasswordFormComponent()->minLength(12);
    }
}

<?php

namespace App\Support;

use App\Models\User;
use Filament\Facades\Filament;

class PasswordResetUrl
{
    public static function forUser(User $user, string $token): string
    {
        if ($user->hasPermissionTo('admin.access')) {
            return Filament::getPanel('admin')->getResetPasswordUrl($token, $user);
        }

        return config('devmasters.frontend_url').'/reset-password?token='.urlencode($token).'&email='.urlencode($user->email);
    }
}

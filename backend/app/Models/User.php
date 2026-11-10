<?php

namespace App\Models;

use App\Notifications\QueuedResetPassword;
use App\Support\Localization;
use Filament\Auth\MultiFactor\App\Concerns\InteractsWithAppAuthentication;
use Filament\Auth\MultiFactor\App\Concerns\InteractsWithAppAuthenticationRecovery;
use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements FilamentUser, HasAppAuthentication, HasAppAuthenticationRecovery, HasName
{
    use HasFactory, HasUuids, InteractsWithAppAuthentication, InteractsWithAppAuthenticationRecovery, Notifiable;
    use HasRoles { roles as protected assignedRoles; }

    public function roles(): MorphToMany
    {
        return $this->assignedRoles()->where('roles.is_active', true);
    }

    protected $guarded = [];

    protected $hidden = ['password_hash', 'remember_token', 'app_authentication_secret', 'app_authentication_recovery_codes'];

    protected function casts(): array
    {
        return ['password_hash' => 'hashed', 'email_verified_at' => 'immutable_datetime', 'app_authentication_secret' => 'encrypted', 'app_authentication_recovery_codes' => 'encrypted:array'];
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify((new QueuedResetPassword($token))->locale(Localization::valid($this->preferred_locale) ? $this->preferred_locale : app()->getLocale()));
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function getFilamentName(): string
    {
        return $this->display_name;
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->status === 'ACTIVE' && $this->hasPermissionTo('admin.access');
    }

    public function expertProfile()
    {
        return $this->hasOne(ExpertProfile::class);
    }

    public function isEligibleExpert(): bool
    {
        $p = $this->expertProfile;

        return $this->status === 'ACTIVE' && $this->email_verified_at && $p && $p->application_status === 'APPROVED' && $p->network_status === 'ACTIVE' && $p->activated_at;
    }
}

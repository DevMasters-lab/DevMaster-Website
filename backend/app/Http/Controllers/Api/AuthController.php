<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExpertProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $u = User::where('email', strtolower(trim($data['email'])))->first();
        abort_unless($u && Hash::check($data['password'], $u->password_hash ?? '') && $u->isEligibleExpert() && ! $u->can('admin.access'), 422, 'The credentials are invalid or this expert account is not activated.');
        Auth::guard('web')->login($u);
        $r->session()->regenerate();
        $u->update(['last_login_at' => now(), 'preferred_locale' => $u->preferred_locale ?? app()->getLocale()]);

        return ['data' => $u->only(['id', 'display_name', 'email', 'preferred_locale'])];
    }

    public function me(Request $r)
    {
        return ['data' => $r->user()->only(['id', 'display_name', 'email', 'preferred_locale'])];
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        Auth::guard('sanctum')->forgetUser();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->noContent();
    }

    public function forgot(Request $r)
    {
        $r->validate(['email' => 'required|email']);
        $u = User::where('email', strtolower(trim($r->email)))->first();
        if ($u && ($u->expertProfile?->application_status === 'APPROVED' || $u->hasPermissionTo('admin.access')) && in_array($u->status, ['INVITED', 'ACTIVE'])) {
            Password::sendResetLink(['email' => $u->email]);
        }

        return ['message' => __('If an eligible account exists, a setup or recovery link will be sent.')];
    }

    public function reset(Request $r)
    {
        $data = $r->validate(['email' => 'required|email', 'token' => 'required|string', 'password' => 'required|string|min:12|confirmed']);
        $status = Password::reset($data, function (User $u, string $password) {
            DB::transaction(function () use ($u, $password) {
                $p = ExpertProfile::lockForUpdate()->where('user_id', $u->id)->first();
                abort_unless((($p && $p->application_status === 'APPROVED') || $u->hasPermissionTo('admin.access')) && in_array($u->status, ['INVITED', 'ACTIVE']), 403, 'Account is not eligible for activation.');
                $u->forceFill(['password_hash' => $password, 'status' => 'ACTIVE', 'email_verified_at' => now(), 'remember_token' => Str::random(60)])->save();
                if ($p) {
                    $p->update(['network_status' => 'ACTIVE', 'activated_at' => $p->activated_at ?? now()]);
                }
            });
        });
        abort_unless($status === Password::PASSWORD_RESET, 422, $status);

        return ['message' => __('Password set. You may now sign in.')];
    }
}

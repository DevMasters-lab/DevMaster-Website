<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AccessManagementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

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

    public function forgot(Request $r, AccessManagementService $access)
    {
        $r->validate(['email' => 'required|email']);
        $access->sendPasswordResetLink($r->input('email'));

        return ['message' => __('If an eligible account exists, a setup or recovery link will be sent.')];
    }

    public function reset(Request $r, AccessManagementService $access)
    {
        $data = $r->validate(['email' => 'required|email', 'token' => 'required|string', 'password' => 'required|string|min:12|confirmed']);
        $status = Password::reset($data, fn (User $user, string $password) => $access->resetPassword($user, $password));
        abort_unless($status === Password::PASSWORD_RESET, 422, $status);

        return ['message' => __('Password set. You may now sign in.')];
    }
}

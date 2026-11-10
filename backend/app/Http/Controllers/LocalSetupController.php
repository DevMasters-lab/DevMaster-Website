<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\AuditTrail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class LocalSetupController extends Controller
{
    public function __invoke(Request $request): View|RedirectResponse
    {
        abort_unless(app()->environment('local'), 404);
        abort_unless(in_array($request->ip(), ['127.0.0.1', '::1']), 403);
        abort_if(User::whereHas('roles', fn ($query) => $query->where('roles.code', 'ADMIN'))->exists(), 409, 'An administrator already exists. Sign in or request a password reset.');
        if ($request->isMethod('get')) {
            return view('local-setup');
        }
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email', '')))]);
        $data = $request->validate([
            'display_name' => ['required', 'string', 'max:200'],
            'email' => ['required', 'email:rfc', 'max:254', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);
        DB::transaction(function () use ($data): void {
            DB::select("SELECT pg_advisory_xact_lock(hashtextextended('devmasters:first-admin',0))");
            abort_if(User::whereHas('roles', fn ($query) => $query->where('roles.code', 'ADMIN'))->exists(), 409, 'An administrator already exists.');
            $role = Role::where('code', 'ADMIN')->where('is_active', true)->firstOrFail();
            $user = User::create([
                'display_name' => $data['display_name'], 'email' => mb_strtolower(trim($data['email'])),
                'password_hash' => Hash::make($data['password']), 'status' => 'ACTIVE', 'email_verified_at' => now(),
            ]);
            $user->assignRole($role);
            app(AuditTrail::class)->record('administrator.bootstrapped', $user, null);
        });

        return redirect('/admin/login')->with('status', 'Administrator created. Sign in and enroll your authenticator app.');
    }
}

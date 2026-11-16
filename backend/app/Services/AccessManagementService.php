<?php

namespace App\Services;

use App\Models\ExpertProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Spatie\Permission\PermissionRegistrar;

class AccessManagementService
{
    public function sendPasswordResetLink(string $email, bool $staffOnly = false): void
    {
        $user = User::where('email', strtolower(trim($email)))->first();
        if (! $user || ! in_array($user->status, ['INVITED', 'ACTIVE'])) {
            return;
        }
        if ($user->hasPermissionTo('admin.access') || (! $staffOnly && $user->expertProfile?->application_status === 'APPROVED')) {
            Password::sendResetLink(['email' => $user->email]);
        }
    }

    public function resetPassword(User $user, string $password): void
    {
        DB::transaction(function () use ($user, $password): void {
            $user = User::lockForUpdate()->findOrFail($user->id);
            $profile = ExpertProfile::lockForUpdate()->where('user_id', $user->id)->first();
            abort_unless((($profile && $profile->application_status === 'APPROVED') || $user->hasPermissionTo('admin.access')) && in_array($user->status, ['INVITED', 'ACTIVE']), 403, 'Account is not eligible for activation.');
            $user->forceFill(['password_hash' => $password, 'status' => 'ACTIVE', 'email_verified_at' => now(), 'remember_token' => Str::random(60)])->save();
            if ($profile) {
                $profile->update(['network_status' => 'ACTIVE', 'activated_at' => $profile->activated_at ?? now()]);
            }
        });
    }

    public function createRole(User $actor, array $input): Role
    {
        Gate::forUser($actor)->authorize('roles.create');
        $data = Validator::make($input, [
            'code' => ['required', 'regex:/^[A-Z][A-Z0-9_]{2,63}$/', Rule::unique('roles', 'code')],
            'name' => ['required', 'string', 'max:120', Rule::unique('roles', 'name')],
            'description' => ['nullable', 'string', 'max:3000'],
            'is_active' => ['sometimes', 'boolean'],
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['uuid', 'distinct', 'exists:permissions,id'],
        ])->validate();

        return DB::transaction(function () use ($actor, $data): Role {
            $role = Role::create(array_intersect_key($data, array_flip(['code', 'name', 'description', 'is_active'])) + ['guard_name' => 'web', 'is_system' => false]);
            $role->syncPermissions(Permission::whereIn('id', $data['permission_ids'])->get());
            app(AuditTrail::class)->record('role.created', $role, $actor, ['code' => $role->code, 'permission_ids' => $data['permission_ids']]);

            return $role;
        });
    }

    public function updateRole(User $actor, Role $role, array $input): Role
    {
        Gate::forUser($actor)->authorize('roles.update');
        $data = Validator::make($input, [
            'record_version' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:120', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => ['nullable', 'string', 'max:3000'],
            'is_active' => ['required', 'boolean'],
            'permission_ids' => ['present', 'array'],
            'permission_ids.*' => ['uuid', 'distinct', 'exists:permissions,id'],
        ])->validate();

        return DB::transaction(function () use ($actor, $role, $data): Role {
            $role = Role::lockForUpdate()->findOrFail($role->id);
            abort_if($role->is_system, 409, 'Built-in roles are protected. Create a custom role.');
            abort_unless($role->record_version === (int) $data['record_version'], 409, 'Role changed. Refresh before saving.');
            abort_if($actor->roles->contains('id', $role->id), 409, 'Use another administrator to change a role assigned to your own account.');
            $role->update(array_intersect_key($data, array_flip(['name', 'description', 'is_active'])));
            $role->syncPermissions(Permission::whereIn('id', $data['permission_ids'])->get());
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            app(AuditTrail::class)->record('role.updated', $role, $actor, ['is_active' => $data['is_active'], 'permission_ids' => $data['permission_ids']]);

            return $role->refresh();
        });
    }

    public function inviteStaff(User $actor, array $input): User
    {
        Gate::forUser($actor)->authorize('users.create');
        Gate::forUser($actor)->authorize('roles.update');
        $input['email'] = mb_strtolower(trim((string) ($input['email'] ?? '')));
        $data = Validator::make($input, [
            'email' => ['required', 'email:rfc', 'max:254', Rule::unique('users', 'email')],
            'display_name' => ['required', 'string', 'max:200'],
            'role_ids' => ['required', 'array', 'min:1'],
            'role_ids.*' => ['required', 'uuid', 'distinct', 'exists:roles,id'],
        ])->validate();

        return DB::transaction(function () use ($actor, $data): User {
            $roles = Role::whereIn('id', $data['role_ids'])->where('is_active', true)->get();
            abort_unless($roles->count() === count($data['role_ids']), 422, 'Select only active roles.');
            abort_if($roles->contains('code', 'EXPERT'), 422, 'Expert accounts must be created through application approval.');
            abort_unless($roles->contains(fn (Role $role): bool => $role->hasPermissionTo('admin.access')), 422, 'A staff role must allow Admin Portal access.');
            $user = User::create(['email' => $data['email'], 'display_name' => $data['display_name'], 'status' => 'INVITED', 'preferred_locale' => app()->getLocale()]);
            $user->syncRoles($roles);
            app(BusinessEvents::class)->record('staff.invited', 'user', $user->id, $actor, $user->email, data: ['message' => 'You have been invited to the DevMasters Admin Portal.']);

            return $user;
        });
    }

    public function assignRoles(User $actor, User $user, array $roleIds): void
    {
        Gate::forUser($actor)->authorize('users.update');
        Gate::forUser($actor)->authorize('roles.update');
        Validator::make(['role_ids' => $roleIds], ['role_ids' => ['required', 'array', 'min:1'], 'role_ids.*' => ['uuid', 'distinct', 'exists:roles,id']])->validate();
        DB::transaction(function () use ($actor, $user, $roleIds): void {
            $user = User::lockForUpdate()->findOrFail($user->id);
            abort_if($user->id === $actor->id, 409, 'Use another administrator to change your own access.');
            $roles = Role::whereIn('id', $roleIds)->where('is_active', true)->get();
            abort_unless($roles->count() === count($roleIds), 422, 'Select only active roles.');
            abort_if($roles->contains('code', 'EXPERT') && ! $user->expertProfile, 422, 'Expert accounts require an approved application.');
            $user->syncRoles($roles);
            app(AuditTrail::class)->record('user.roles-changed', $user, $actor, ['role_ids' => $roleIds]);
        });
    }

    public function changeStatus(User $actor, User $user, string $status): void
    {
        Gate::forUser($actor)->authorize('users.update');
        Validator::make(['status' => $status], ['status' => ['required', Rule::in(['ACTIVE', 'SUSPENDED', 'DISABLED'])]])->validate();
        DB::transaction(function () use ($actor, $user, $status): void {
            $user = User::lockForUpdate()->findOrFail($user->id);
            abort_if($user->id === $actor->id, 409, 'Use another administrator to change your own access.');
            if ($status === 'ACTIVE') {
                abort_unless($user->password_hash && $user->email_verified_at, 409, 'The account must complete password setup first.');
                if ($user->expertProfile) {
                    abort_unless($user->expertProfile->activated_at && $user->expertProfile->application_status === 'APPROVED', 409, 'Experts must complete approval and activation.');
                }
            }
            $before = $user->status;
            $user->update(['status' => $status]);
            app(AuditTrail::class)->record('user.status-changed', $user, $actor, ['before' => $before, 'after' => $status]);
        });
    }
}

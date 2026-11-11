<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
            $permissions = ['admin.access', 'users.manage', 'roles.manage', 'crm.manage', 'requests.manage', 'experts.review', 'experts.activate', 'experts.manage', 'matching.manage', 'offers.prepare', 'offers.issue', 'offers.record-response', 'selections.decide', 'placements.manage', 'documents.view', 'notifications.manage', 'content.manage', 'audit.view', 'settings.manage', 'reports.export'];
            foreach ($permissions as $code) {
                $matches = Permission::where('code', $code)->orWhere(fn ($query) => $query->where('name', $code)->where('guard_name', 'web'))->lockForUpdate()->get();
                $permission = $matches->first();
                if ($matches->count() > 1 || ($permission && ($permission->code !== $code || $permission->name !== $code || $permission->guard_name !== 'web'))) {
                    throw new RuntimeException('Conflicting permission definitions require review; no permission definitions were replaced.');
                }
                if (! $permission) {
                    Permission::create(['code' => $code, 'name' => $code, 'guard_name' => 'web', 'module' => explode('.', $code)[0], 'description' => $code]);
                }
            }

            $grants = [
                'ADMIN' => $permissions,
                'STAFF' => ['admin.access', 'crm.manage', 'requests.manage', 'experts.manage', 'matching.manage', 'offers.prepare', 'documents.view'],
                'EXPERT' => [],
            ];
            foreach ($grants as $code => $names) {
                $matches = Role::where('code', $code)->orWhere(fn ($query) => $query->where('name', $code)->where('guard_name', 'web'))->lockForUpdate()->get();
                $role = $matches->first();
                if ($matches->count() > 1 || ($role && ($role->code !== $code || $role->name !== $code || $role->guard_name !== 'web'))) {
                    throw new RuntimeException('Conflicting role definitions require review; no role definitions were replaced.');
                }
                $role ??= Role::create(['code' => $code, 'name' => $code, 'guard_name' => 'web', 'is_system' => true]);
                if ($names !== []) {
                    $role->givePermissionTo($names);
                }
            }
        });
    }
}

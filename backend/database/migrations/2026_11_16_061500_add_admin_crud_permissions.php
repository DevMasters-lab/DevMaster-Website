<?php

use App\Models\Permission;
use App\Models\Role;
use App\Support\AdminPermissions;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            foreach (AdminPermissions::definitions() as $name => $description) {
                $matches = Permission::where('code', $name)
                    ->orWhere(fn ($query) => $query->where('name', $name)->where('guard_name', 'web'))
                    ->lockForUpdate()->get();
                $permission = $matches->first();

                if ($matches->count() > 1 || ($permission && ($permission->code !== $name || $permission->name !== $name || $permission->guard_name !== 'web'))) {
                    throw new RuntimeException('Conflicting permission definitions require review; no permission definitions were replaced.');
                }

                if (! $permission) {
                    Permission::create(['code' => $name, 'name' => $name, 'guard_name' => 'web', 'module' => explode('.', $name)[0], 'description' => $description]);
                }
            }

            $permissionIds = Permission::where('guard_name', 'web')->pluck('id', 'name');
            $rolePermissionsTable = config('permission.table_names.role_has_permissions');
            $modelPermissionsTable = config('permission.table_names.model_has_permissions');

            foreach (AdminPermissions::legacyGrants() as $legacy => $grants) {
                if (! isset($permissionIds[$legacy])) {
                    continue;
                }

                $roleGrants = DB::table($rolePermissionsTable)
                    ->where('permission_id', $permissionIds[$legacy])
                    ->whereIn('role_id', Role::where('guard_name', 'web')->select('id'))
                    ->get();
                $modelGrants = DB::table($modelPermissionsTable)->where('permission_id', $permissionIds[$legacy])->get();

                foreach ($grants as $name) {
                    foreach ($roleGrants as $grant) {
                        DB::table($rolePermissionsTable)->insertOrIgnore([...((array) $grant), 'permission_id' => $permissionIds[$name]]);
                    }

                    foreach ($modelGrants as $grant) {
                        DB::table($modelPermissionsTable)->insertOrIgnore([...((array) $grant), 'permission_id' => $permissionIds[$name]]);
                    }
                }
            }

            foreach (Role::where('code', 'ADMIN')->where('guard_name', 'web')->pluck('id') as $roleId) {
                foreach (array_keys(AdminPermissions::definitions()) as $name) {
                    DB::table($rolePermissionsTable)->insertOrIgnore(['role_id' => $roleId, 'permission_id' => $permissionIds[$name]]);
                }
            }
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        throw new RuntimeException('Permission grants cannot be safely removed automatically. Use a reviewed forward migration.');
    }
};

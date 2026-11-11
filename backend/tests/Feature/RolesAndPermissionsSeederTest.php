<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class RolesAndPermissionsSeederTest extends TestCase
{
    use DatabaseTransactions;

    public function test_creates_canonical_access_roles_without_creating_accounts(): void
    {
        $this->isolatePermissionTables();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertDatabaseCount('roles', 3);
        $this->assertDatabaseCount('permissions', 20);
        $this->assertTrue(Role::findByName('ADMIN')->hasPermissionTo('users.manage'));
        $this->assertTrue(Role::findByName('STAFF')->hasPermissionTo('admin.access'));
        $this->assertFalse(Role::findByName('STAFF')->hasPermissionTo('users.manage'));
        $this->assertSame(0, Role::findByName('EXPERT')->permissions()->count());
        $this->assertDatabaseCount('user_roles', 0);
    }

    public function test_rerunning_preserves_custom_grants_and_existing_role_metadata(): void
    {
        $this->isolatePermissionTables();
        $this->seed(RolesAndPermissionsSeeder::class);
        $permission = Permission::create(['code' => 'custom.permission', 'name' => 'custom.permission', 'guard_name' => 'web', 'module' => 'custom', 'description' => 'Existing custom permission']);
        foreach (['ADMIN', 'STAFF', 'EXPERT'] as $name) {
            Role::findByName($name)->givePermissionTo($permission);
        }
        $staff = Role::findByName('STAFF');
        $staff->update(['is_active' => false, 'is_system' => false]);
        $originalRole = $staff->fresh()->getRawOriginal();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertDatabaseCount('roles', 3);
        $this->assertDatabaseCount('permissions', 21);
        $this->assertDatabaseCount('role_permissions', 30);
        foreach (['ADMIN', 'STAFF', 'EXPERT'] as $name) {
            $this->assertTrue(Role::findByName($name)->hasPermissionTo('custom.permission'));
        }
        $this->assertSame($originalRole, $staff->fresh()->getRawOriginal());
    }

    public function test_rolls_back_conflicting_permission_definitions_instead_of_replacing_them(): void
    {
        $this->isolatePermissionTables();
        $permission = Permission::create(['code' => 'users.manage', 'name' => 'legacy.users.manage', 'guard_name' => 'web', 'module' => 'custom', 'description' => 'Preserved legacy definition']);
        $original = $permission->fresh()->getRawOriginal();

        try {
            $this->seed(RolesAndPermissionsSeeder::class);
            $this->fail('Conflicting permission definitions unexpectedly succeeded.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Conflicting permission definitions require review; no permission definitions were replaced.', $exception->getMessage());
        }

        $this->assertSame($original, $permission->fresh()->getRawOriginal());
        $this->assertDatabaseCount('permissions', 1);
        $this->assertDatabaseCount('roles', 0);
        $this->assertDatabaseCount('role_permissions', 0);
    }

    public function test_rolls_back_conflicting_role_definitions_instead_of_replacing_them(): void
    {
        $this->isolatePermissionTables();
        $role = Role::create(['code' => 'ADMIN', 'name' => 'legacy-admin', 'guard_name' => 'web']);
        $original = $role->fresh()->getRawOriginal();

        try {
            $this->seed(RolesAndPermissionsSeeder::class);
            $this->fail('Conflicting role definitions unexpectedly succeeded.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Conflicting role definitions require review; no role definitions were replaced.', $exception->getMessage());
        }

        $this->assertSame($original, $role->fresh()->getRawOriginal());
        $this->assertDatabaseCount('roles', 1);
        $this->assertDatabaseCount('permissions', 0);
        $this->assertDatabaseCount('role_permissions', 0);
    }

    private function isolatePermissionTables(): void
    {
        foreach (['roles', 'permissions', 'user_roles', 'role_permissions'] as $table) {
            DB::statement('CREATE TEMP TABLE '.$table.' (LIKE public.'.$table.' INCLUDING ALL) ON COMMIT DROP');
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}

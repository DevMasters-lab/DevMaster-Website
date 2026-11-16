<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminPermissionUpgradeTest extends TestCase
{
    use DatabaseTransactions;

    public function test_upgrade_preserves_legacy_grants_and_adds_scoped_permissions_without_new_non_admin_delete_access(): void
    {
        $this->isolatePermissionTables();
        $legacyNames = ['admin.access', 'users.manage', 'roles.manage', 'crm.manage', 'requests.manage', 'experts.review', 'experts.activate', 'experts.manage', 'matching.manage', 'offers.prepare', 'offers.issue', 'offers.record-response', 'selections.decide', 'placements.manage', 'documents.view', 'notifications.manage', 'content.manage', 'audit.view', 'settings.manage', 'reports.export'];
        foreach ($legacyNames as $name) {
            Permission::create(['code' => $name, 'name' => $name, 'guard_name' => 'web', 'module' => explode('.', $name)[0], 'description' => $name]);
        }
        $customPermission = Permission::create(['code' => 'custom.permission', 'name' => 'custom.permission', 'guard_name' => 'web', 'module' => 'custom', 'description' => 'Existing custom permission']);
        $administrator = Role::create(['code' => 'ADMIN', 'name' => 'ADMIN', 'guard_name' => 'web', 'is_system' => true]);
        $administrator->givePermissionTo($legacyNames);
        $staff = Role::create(['code' => 'STAFF', 'name' => 'STAFF', 'guard_name' => 'web', 'is_active' => false]);
        $staff->givePermissionTo(['requests.manage', 'documents.view', $customPermission->name]);
        $originalStaff = $staff->fresh()->getRawOriginal();
        $customRole = Role::create(['code' => 'LEGACY_USERS', 'name' => 'Legacy users', 'guard_name' => 'web']);
        $customRole->givePermissionTo('users.manage');
        $emptyRole = Role::create(['code' => 'NO_GRANTS', 'name' => 'No grants', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->givePermissionTo('roles.manage');

        $migration = require database_path('migrations/2026_11_16_061500_add_admin_crud_permissions.php');
        $migration->up();

        $this->assertDatabaseCount('permissions', 52);
        $this->assertSame(51, $administrator->permissions()->count());
        $this->assertTrue($administrator->fresh()->hasPermissionTo('users.delete'));
        $this->assertTrue($administrator->fresh()->hasPermissionTo('document_versions.delete'));
        $this->assertSame(['custom.permission', 'document_versions.view', 'documents.create', 'documents.view', 'requests.create', 'requests.manage', 'requests.update', 'requests.view'], $staff->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertSame($originalStaff, $staff->fresh()->getRawOriginal());
        $this->assertSame(['users.create', 'users.manage', 'users.update', 'users.view'], $customRole->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertSame(0, $emptyRole->permissions()->count());
        $this->assertSame(['roles.create', 'roles.manage', 'roles.update', 'roles.view'], $user->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertFalse($user->fresh()->hasPermissionTo('roles.delete'));
        $this->assertFalse($customRole->fresh()->hasPermissionTo('users.delete'));

        $originalPermissions = Permission::orderBy('name')->get()->toArray();
        $originalRoleGrants = $this->grants('role_permissions');
        $originalDirectGrants = $this->grants('model_has_permissions');

        $migration->up();

        $this->assertSame($originalPermissions, Permission::orderBy('name')->get()->toArray());
        $this->assertSame($originalRoleGrants, $this->grants('role_permissions'));
        $this->assertSame($originalDirectGrants, $this->grants('model_has_permissions'));
    }

    public function test_upgrade_rolls_back_conflicting_permission_definitions_without_replacing_existing_data(): void
    {
        $this->isolatePermissionTables();
        $permission = Permission::create(['code' => 'users.view', 'name' => 'legacy.users.view', 'guard_name' => 'web', 'module' => 'custom', 'description' => 'Preserved permission']);
        $original = $permission->fresh()->getRawOriginal();
        $migration = require database_path('migrations/2026_11_16_061500_add_admin_crud_permissions.php');

        try {
            $migration->up();
            $this->fail('Conflicting permission definitions unexpectedly succeeded.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Conflicting permission definitions require review; no permission definitions were replaced.', $exception->getMessage());
        }

        $this->assertDatabaseCount('permissions', 1);
        $this->assertDatabaseCount('role_permissions', 0);
        $this->assertDatabaseCount('model_has_permissions', 0);
        $this->assertSame($original, $permission->fresh()->getRawOriginal());
    }

    private function isolatePermissionTables(): void
    {
        foreach (['roles', 'permissions', 'role_permissions', 'model_has_permissions'] as $table) {
            DB::statement('CREATE TEMP TABLE '.$table.' (LIKE public.'.$table.' INCLUDING ALL) ON COMMIT DROP');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @return list<array<string, mixed>> */
    private function grants(string $table): array
    {
        return DB::table($table)->orderBy('permission_id')->get()->map(fn (object $grant): array => (array) $grant)->all();
    }
}

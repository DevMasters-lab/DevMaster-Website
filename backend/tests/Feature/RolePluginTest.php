<?php

namespace Tests\Feature;

use App\Filament\Resources\RoleResource\CreateRole;
use App\Filament\Resources\RoleResource\EditRole;
use App\Filament\Resources\RoleResource\ManageRecords as ManageRoles;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Livewire\Livewire;
use Tests\TestCase;

class RolePluginTest extends TestCase
{
    use DatabaseTransactions;

    public function test_shield_form_creates_an_audited_custom_role_using_existing_permissions(): void
    {
        $admin = $this->user('ADMIN');
        $permissionCount = Permission::count();

        Livewire::actingAs($admin)->test(ManageRoles::class)
            ->assertActionVisible('create');

        Livewire::actingAs($admin)->test(CreateRole::class)
            ->fillForm([
                'code' => 'SHIELD_REVIEWER',
                'name' => 'Shield reviewer',
                'description' => 'Reviews submitted requests.',
                'is_active' => true,
                'permissions_admin' => ['admin.access'],
                'permissions_requests' => ['requests.view'],
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $role = Role::where('code', 'SHIELD_REVIEWER')->firstOrFail();
        $this->assertSame('Shield reviewer', $role->name);
        $this->assertSame('Reviews submitted requests.', $role->description);
        $this->assertSame('web', $role->guard_name);
        $this->assertFalse((bool) $role->is_system);
        $this->assertTrue((bool) $role->is_active);
        $this->assertSame(['admin.access', 'requests.view'], $role->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertSame($permissionCount, Permission::count());
        $this->assertDatabaseHas('audit_events', ['entity_id' => $role->id, 'action' => 'role.created', 'actor_user_id' => $admin->id]);
    }

    public function test_shield_select_all_grants_only_sidebar_permissions_without_changing_the_catalogue(): void
    {
        $admin = $this->user('ADMIN');
        $permissionNames = Permission::where('guard_name', 'web')->orderBy('name')->pluck('name')->all();

        Livewire::actingAs($admin)->test(CreateRole::class)
            ->fillForm(['code' => 'SHIELD_ALL', 'name' => 'Shield all permissions', 'is_active' => true])
            ->set('data.select_all', true)
            ->call('create')
            ->assertHasNoFormErrors();

        $role = Role::where('code', 'SHIELD_ALL')->firstOrFail();
        $this->assertSame([
            'admin.access',
            'content.create',
            'content.delete',
            'content.update',
            'content.view',
            'document_versions.create',
            'document_versions.delete',
            'document_versions.update',
            'document_versions.view',
            'documents.create',
            'documents.delete',
            'documents.update',
            'documents.view',
            'notifications.create',
            'notifications.delete',
            'notifications.update',
            'notifications.view',
            'requests.create',
            'requests.delete',
            'requests.update',
            'requests.view',
            'roles.create',
            'roles.delete',
            'roles.update',
            'roles.view',
            'settings.create',
            'settings.delete',
            'settings.update',
            'settings.view',
            'users.create',
            'users.delete',
            'users.update',
            'users.view',
        ], $role->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertCount(51, $permissionNames);
        $this->assertSame($permissionNames, Permission::where('guard_name', 'web')->orderBy('name')->pluck('name')->all());
    }

    public function test_shield_edit_hydrates_and_replaces_permissions_through_the_audited_service(): void
    {
        $admin = $this->user('ADMIN');
        $role = $this->customRole('SHIELD_EDIT');
        $role->syncPermissions(['admin.access', 'requests.update']);
        $version = $role->record_version;
        Livewire::actingAs($admin)->test(ManageRoles::class)
            ->assertActionVisible(TestAction::make('edit')->table($role));
        $component = Livewire::actingAs($admin)->test(EditRole::class, ['record' => $role->getRouteKey()]);
        $this->assertSame(['admin.access'], $component->get('data.permissions_admin'));
        $this->assertSame(['requests.update'], $component->get('data.permissions_requests'));
        $this->assertSame([], $component->get('data.permissions_documents'));

        $component->fillForm([
            'name' => 'Updated Shield role',
            'description' => 'Document review only.',
            'is_active' => false,
            'permissions_admin' => [],
            'permissions_requests' => [],
            'permissions_documents' => ['documents.view'],
        ])
            ->call('save')
            ->assertHasNoFormErrors();

        $role->refresh();
        $this->assertSame('SHIELD_EDIT', $role->code);
        $this->assertSame('Updated Shield role', $role->name);
        $this->assertSame('Document review only.', $role->description);
        $this->assertFalse((bool) $role->is_active);
        $this->assertSame($version + 1, $role->record_version);
        $this->assertSame(['documents.view'], $role->permissions()->pluck('name')->all());
        $this->assertDatabaseHas('audit_events', ['entity_id' => $role->id, 'action' => 'role.updated', 'actor_user_id' => $admin->id]);
    }

    public function test_shield_edit_preserves_existing_hidden_permissions_when_replacing_sidebar_permissions(): void
    {
        $admin = $this->user('ADMIN');
        $role = $this->customRole('SHIELD_HIDDEN');
        $role->syncPermissions(['admin.access', 'experts.review']);

        Livewire::actingAs($admin)->test(EditRole::class, ['record' => $role->getRouteKey()])
            ->fillForm([
                'permissions_admin' => [],
                'permissions_documents' => ['documents.view'],
            ])
            ->set('data.permissions_experts', ['experts.activate'])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame(['documents.view', 'experts.review'], $role->permissions()->orderBy('name')->pluck('name')->all());
        $this->assertDatabaseHas('audit_events', ['entity_id' => $role->id, 'action' => 'role.updated', 'actor_user_id' => $admin->id]);
    }

    public function test_forged_hidden_module_state_cannot_grant_permissions_when_creating_a_role(): void
    {
        $admin = $this->user('ADMIN');
        $permissionNames = Permission::where('guard_name', 'web')->orderBy('name')->pluck('name')->all();

        Livewire::actingAs($admin)->test(CreateRole::class)
            ->assertFormFieldExists('permissions_admin')
            ->assertFormFieldExists('permissions_users')
            ->assertFormFieldExists('permissions_roles')
            ->assertFormFieldDoesNotExist('permissions_experts')
            ->assertFormFieldDoesNotExist('permissions_offers')
            ->fillForm([
                'code' => 'SHIELD_FORGED_HIDDEN',
                'name' => 'Forged hidden permissions',
                'is_active' => true,
                'permissions_admin' => ['admin.access'],
            ])
            ->set('data.permissions_experts', ['experts.review'])
            ->call('create')
            ->assertHasNoFormErrors();

        $role = Role::where('code', 'SHIELD_FORGED_HIDDEN')->firstOrFail();
        $this->assertSame(['admin.access'], $role->permissions()->pluck('name')->all());
        $this->assertSame($permissionNames, Permission::where('guard_name', 'web')->orderBy('name')->pluck('name')->all());
        $this->assertDatabaseHas('audit_events', ['entity_id' => $role->id, 'action' => 'role.created', 'actor_user_id' => $admin->id]);
    }

    public function test_staff_without_role_management_cannot_open_role_creation_or_editing(): void
    {
        $staff = $this->user('STAFF');
        $role = $this->customRole('SHIELD_DENIED');

        $this->actingAs($staff)->get('/admin/roles/create')->assertForbidden();
        $this->get('/admin/roles/'.$role->getRouteKey().'/edit')->assertForbidden();
    }

    public function test_built_in_role_editing_remains_forbidden_to_administrators(): void
    {
        $admin = $this->user('ADMIN');
        $role = Role::where('code', 'STAFF')->firstOrFail();

        Livewire::actingAs($admin)->test(ManageRoles::class)
            ->assertActionHidden(TestAction::make('edit')->table($role));
        $this->actingAs($admin)->get('/admin/roles/'.$role->getRouteKey().'/edit')->assertForbidden();
    }

    public function test_administrators_cannot_edit_a_custom_role_assigned_to_their_own_account(): void
    {
        $admin = $this->user('ADMIN');
        $role = $this->customRole('SHIELD_SELF');
        $role->syncPermissions(['admin.access', 'roles.update']);
        $admin->assignRole($role);

        Livewire::actingAs($admin)->test(ManageRoles::class)
            ->assertActionHidden(TestAction::make('edit')->table($role));
        $this->actingAs($admin)->get('/admin/roles/'.$role->getRouteKey().'/edit')->assertForbidden();
    }

    public function test_unknown_permission_keys_are_rejected_without_creating_roles_or_permissions(): void
    {
        $admin = $this->user('ADMIN');
        $permissionCount = Permission::count();

        Livewire::actingAs($admin)->test(CreateRole::class)
            ->fillForm([
                'code' => 'SHIELD_INVALID',
                'name' => 'Invalid permission role',
                'is_active' => true,
                'permissions_admin' => ['Invented:Administrator'],
            ])
            ->call('create')
            ->assertHasFormErrors();

        $this->assertDatabaseMissing('roles', ['code' => 'SHIELD_INVALID']);
        $this->assertDatabaseMissing('permissions', ['name' => 'Invented:Administrator']);
        $this->assertSame($permissionCount, Permission::count());
    }

    public function test_permission_keys_from_another_module_are_rejected_without_creating_a_role(): void
    {
        $admin = $this->user('ADMIN');
        $permissionCount = Permission::count();

        Livewire::actingAs($admin)->test(CreateRole::class)
            ->fillForm([
                'code' => 'SHIELD_WRONG_GROUP',
                'name' => 'Wrong permission group',
                'is_active' => true,
                'permissions_admin' => ['documents.view'],
            ])
            ->call('create')
            ->assertHasFormErrors();

        $this->assertDatabaseMissing('roles', ['code' => 'SHIELD_WRONG_GROUP']);
        $this->assertSame($permissionCount, Permission::count());
    }

    public function test_a_stale_shield_edit_cannot_overwrite_a_concurrent_role_change(): void
    {
        $admin = $this->user('ADMIN');
        $role = $this->customRole('SHIELD_STALE');
        $role->syncPermissions(['admin.access']);
        $component = Livewire::actingAs($admin)->test(EditRole::class, ['record' => $role->getRouteKey()]);
        $role->update(['description' => 'Saved by another administrator.']);

        $component->fillForm([
            'name' => 'Stale draft',
            'description' => 'Outdated change.',
            'permissions_admin' => [],
            'permissions_documents' => ['documents.view'],
        ])
            ->call('save')
            ->assertNotified('Refresh and try again');

        $role->refresh();
        $this->assertSame('SHIELD_STALE', $role->name);
        $this->assertSame('Saved by another administrator.', $role->description);
        $this->assertSame(['admin.access'], $role->permissions()->pluck('name')->all());
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $role->id, 'action' => 'role.updated']);
    }

    private function user(string $role): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create();
        $user->assignRole($role);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();

        return $user;
    }

    private function customRole(string $code): Role
    {
        return Role::create(['code' => $code, 'name' => $code, 'guard_name' => 'web', 'is_system' => false, 'is_active' => true])->refresh();
    }
}

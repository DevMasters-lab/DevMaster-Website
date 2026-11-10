<?php

namespace Tests\Feature;

use App\Filament\Resources\UserResource\ManageRecords;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\AccessManagementService;
use Filament\Facades\Filament;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Password;
use Livewire\Livewire;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class AccessManagementTest extends TestCase
{
    use DatabaseTransactions;

    private function administrator(): User
    {
        $this->seed();
        $actor = User::factory()->create();
        $actor->assignRole('ADMIN');

        return $actor;
    }

    public function test_custom_role_creation_grants_selected_permissions_and_is_audited(): void
    {
        $actor = $this->administrator();
        $permissions = Permission::whereIn('name', ['admin.access', 'requests.manage'])->pluck('id')->all();

        $role = app(AccessManagementService::class)->createRole($actor, ['code' => 'REQUEST_REVIEWER', 'name' => 'Request reviewer', 'permission_ids' => $permissions, 'is_system' => true]);

        $this->assertFalse((bool) $role->is_system);
        $this->assertSame(2, $role->permissions()->count());
        $this->assertDatabaseHas('audit_events', ['entity_id' => $role->id, 'action' => 'role.created', 'actor_user_id' => $actor->id]);
    }

    public function test_staff_invitation_and_password_setup_keep_mfa_and_expert_access_separate(): void
    {
        $actor = $this->administrator();
        $role = Role::where('code', 'STAFF')->firstOrFail();

        $user = app(AccessManagementService::class)->inviteStaff($actor, ['email' => 'New.Staff@example.test', 'display_name' => 'New staff', 'role_ids' => [$role->id], 'status' => 'ACTIVE']);

        $this->assertSame('INVITED', $user->status);
        $this->assertNull($user->password_hash);
        $this->assertSame('new.staff@example.test', $user->email);
        $this->assertDatabaseHas('outbox_events', ['aggregate_id' => $user->id, 'event_type' => 'staff.invited']);
        $token = Password::createToken($user);
        $this->postJson('/api/v1/auth/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'Staff-test-password-123!', 'password_confirmation' => 'Staff-test-password-123!'])->assertOk();
        $this->assertSame('ACTIVE', $user->refresh()->status);
        $this->assertNull($user->app_authentication_secret);
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Staff-test-password-123!'])->assertUnprocessable();
    }

    public function test_inactive_custom_roles_stop_contributing_permissions(): void
    {
        $actor = $this->administrator();
        $service = app(AccessManagementService::class);
        $permissions = Permission::whereIn('name', ['admin.access', 'requests.manage'])->pluck('id')->all();
        $role = $service->createRole($actor, ['code' => 'TEMP_REVIEWER', 'name' => 'Temporary reviewer', 'permission_ids' => $permissions]);
        $user = User::factory()->create();
        $user->assignRole($role);
        $this->assertTrue($user->can('requests.manage'));

        $service->updateRole($actor, $role->refresh(), ['record_version' => $role->record_version, 'name' => $role->name, 'is_active' => false, 'permission_ids' => $permissions]);

        $this->assertFalse($user->fresh()->can('requests.manage'));
    }

    public function test_staff_without_role_management_permission_cannot_invite_users(): void
    {
        $this->seed();
        $user = User::factory()->create();
        $user->assignRole('STAFF');
        $this->expectException(AuthorizationException::class);

        app(AccessManagementService::class)->inviteStaff($user, ['email' => 'denied@example.test', 'display_name' => 'Denied', 'role_ids' => []]);
    }

    public function test_builtin_roles_and_self_access_are_protected(): void
    {
        $actor = $this->administrator();
        $role = Role::where('code', 'ADMIN')->firstOrFail();
        $this->expectException(HttpException::class);

        app(AccessManagementService::class)->updateRole($actor, $role, ['record_version' => $role->record_version, 'name' => 'Altered administrator', 'is_active' => false, 'permission_ids' => []]);
    }

    public function test_suspension_is_audited_and_unactivated_staff_cannot_be_enabled(): void
    {
        $actor = $this->administrator();
        $user = User::factory()->create();
        $service = app(AccessManagementService::class);
        $service->changeStatus($actor, $user, 'SUSPENDED');
        $this->assertSame('SUSPENDED', $user->fresh()->status);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $user->id, 'action' => 'user.status-changed']);
        $user->update(['password_hash' => null]);
        $this->expectException(HttpException::class);
        $service->changeStatus($actor, $user, 'ACTIVE');
    }

    public function test_admin_cannot_suspend_own_account_through_filament_and_sees_feedback(): void
    {
        $actor = $this->administrator();
        $this->actingAs($actor);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        Livewire::test(ManageRecords::class)
            ->callTableAction('accountStatus', $actor, ['status' => 'SUSPENDED'])
            ->assertNotified('Refresh and try again');
        $this->assertSame('ACTIVE', $actor->fresh()->status);
    }
}

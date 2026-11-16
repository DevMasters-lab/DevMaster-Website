<?php

namespace Tests\Feature;

use App\Filament\Pages\RequestPasswordReset;
use App\Filament\Pages\ResetPassword;
use App\Jobs\DeliverOutboxEvent;
use App\Models\OutboxEvent;
use App\Models\Role;
use App\Models\User;
use App\Notifications\BusinessNotification;
use App\Notifications\QueuedResetPassword;
use App\Services\AccessManagementService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Facades\Filament;
use Illuminate\Auth\Events\PasswordReset as PasswordResetEvent;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\Support\WorkflowFixture;
use Tests\TestCase;

class StaffPasswordSetupTest extends TestCase
{
    use DatabaseTransactions;

    public function test_invited_staff_can_request_a_fresh_native_setup_link(): void
    {
        Notification::fake();
        $staff = $this->user('STAFF', 'INVITED');

        Livewire::test(RequestPasswordReset::class)->fillForm(['email' => $staff->email])
            ->call('request')->assertNotified(__('passwords.sent'));

        Notification::assertSentTo($staff, QueuedResetPassword::class, fn (QueuedResetPassword $notification): bool => parse_url($notification->toMail($staff)->actionUrl, PHP_URL_PATH) === '/admin/password-reset/reset');
        $this->assertSame('INVITED', $staff->refresh()->status);
    }

    #[TestWith(['STAFF', 'SUSPENDED'])]
    #[TestWith(['EXPERT', 'ACTIVE'])]
    public function test_native_recovery_does_not_send_links_for_ineligible_accounts(string $role, string $status): void
    {
        Notification::fake();
        $user = $this->user($role, $status);

        Livewire::test(RequestPasswordReset::class)->fillForm(['email' => $user->email])
            ->call('request')->assertNotified(__('passwords.sent'));

        Notification::assertNothingSent();
    }

    public function test_native_recovery_keeps_the_same_confirmation_for_unknown_accounts(): void
    {
        Notification::fake();
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();

        Livewire::test(RequestPasswordReset::class)->fillForm(['email' => 'missing-native-user@example.test'])
            ->call('request')->assertNotified(__('passwords.sent'));

        Notification::assertNothingSent();
    }

    public function test_expert_recovery_keeps_its_existing_api_response_and_destination(): void
    {
        $this->seed();
        $fixture = WorkflowFixture::make();
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $fixture['user']->email])
            ->assertOk()->assertJsonPath('message', 'If an eligible account exists, a setup or recovery link will be sent.');

        Notification::assertSentTo($fixture['user'], QueuedResetPassword::class, fn (QueuedResetPassword $notification): bool => parse_url($notification->toMail($fixture['user'])->actionUrl, PHP_URL_PATH) === '/reset-password');
    }

    public function test_staff_invitation_email_links_to_the_existing_native_reset_form(): void
    {
        Notification::fake();
        $admin = $this->user('ADMIN');
        $staff = app(AccessManagementService::class)->inviteStaff($admin, ['display_name' => 'Invited staff', 'email' => 'native-setup@example.test', 'role_ids' => [Role::findByName('STAFF')->id]]);
        $event = OutboxEvent::where('event_type', 'staff.invited')->where('aggregate_id', $staff->id)->firstOrFail();

        (new DeliverOutboxEvent($event->id))->handle();

        Notification::assertSentOnDemand(BusinessNotification::class, function (BusinessNotification $notification): bool {
            return str_contains($notification->message, '/admin/password-reset/reset?') && ! str_contains($notification->message, '/reset-password?');
        });
        $this->assertSame('PUBLISHED', $event->fresh()->status);
    }

    public function test_queued_staff_recovery_notification_also_uses_the_native_form(): void
    {
        $staff = $this->user('STAFF');
        $notification = new QueuedResetPassword('test-token');

        $url = $notification->toMail($staff)->actionUrl;

        $this->assertSame('/admin/password-reset/reset', parse_url($url, PHP_URL_PATH));
        $this->get($url)->assertOk();
    }

    public function test_native_password_setup_activates_an_invited_staff_account_without_signing_it_in(): void
    {
        $staff = $this->user('STAFF', 'INVITED');
        Event::fake([PasswordResetEvent::class]);
        $token = Password::createToken($staff);

        Livewire::test(ResetPassword::class, ['email' => $staff->email, 'token' => $token])
            ->fillForm(['password' => 'Native-test-password-123!', 'passwordConfirmation' => 'Native-test-password-123!'])
            ->call('resetPassword')->assertHasNoFormErrors()->assertRedirect('/admin/login');

        $this->assertSame('ACTIVE', $staff->refresh()->status);
        $this->assertNotNull($staff->email_verified_at);
        $this->assertTrue(Hash::check('Native-test-password-123!', $staff->password_hash));
        $this->assertGuest('web');
        Event::assertDispatched(PasswordResetEvent::class, fn (PasswordResetEvent $event): bool => $event->user->is($staff)
            && $event->user->status === 'ACTIVE'
            && Hash::check('Native-test-password-123!', $event->user->password_hash));
    }

    public function test_invalid_tokens_do_not_change_an_invited_account(): void
    {
        $staff = $this->user('STAFF', 'INVITED');
        $originalHash = $staff->password_hash;

        Livewire::test(ResetPassword::class, ['email' => $staff->email, 'token' => 'invalid-token'])
            ->fillForm(['password' => 'Native-test-password-123!', 'passwordConfirmation' => 'Native-test-password-123!'])
            ->call('resetPassword')->assertNotified(__('passwords.token'));

        $this->assertSame('INVITED', $staff->refresh()->status);
        $this->assertSame($originalHash, $staff->password_hash);
    }

    public function test_staff_setup_preserves_the_existing_twelve_character_minimum(): void
    {
        $staff = $this->user('STAFF', 'INVITED');
        $token = Password::createToken($staff);

        Livewire::test(ResetPassword::class, ['email' => $staff->email, 'token' => $token])
            ->fillForm(['password' => 'Short123!', 'passwordConfirmation' => 'Short123!'])
            ->call('resetPassword')->assertHasFormErrors(['password']);

        $this->assertSame('INVITED', $staff->refresh()->status);
    }

    #[TestWith(['STAFF', 'SUSPENDED'])]
    #[TestWith(['STAFF', 'DISABLED'])]
    #[TestWith(['EXPERT', 'ACTIVE'])]
    public function test_native_setup_rejects_users_without_eligible_panel_access(string $role, string $status): void
    {
        $user = $this->user($role, $status);
        $originalHash = $user->password_hash;
        $token = Password::createToken($user);

        Livewire::test(ResetPassword::class, ['email' => $user->email, 'token' => $token])
            ->fillForm(['password' => 'Native-test-password-123!', 'passwordConfirmation' => 'Native-test-password-123!'])
            ->call('resetPassword')->assertNotified(__('passwords.user'));

        $this->assertSame($status, $user->refresh()->status);
        $this->assertSame($originalHash, $user->password_hash);
    }

    private function user(string $role, string $status = 'ACTIVE'): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        $user = User::factory()->create(['status' => $status]);
        $user->assignRole($role);

        return $user;
    }
}

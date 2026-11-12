<?php

namespace Tests\Feature;

use App\Livewire\AdminNotifications;
use App\Models\Notification;
use App\Models\User;
use App\Services\BusinessEvents;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Livewire\Livewire;
use Tests\TestCase;

class AdminHeaderTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
    }

    public function test_inbox_shows_only_the_signed_in_admins_notifications_and_counts_unread_items(): void
    {
        $admin = $this->admin();
        $other = $this->admin();
        $this->notice($admin, 'My unread notification');
        $this->notice($admin, 'My read notification')->update(['read_at' => now()]);
        $this->notice($other, 'Another administrators private notification');

        Livewire::actingAs($admin, 'web')->test(AdminNotifications::class)
            ->assertSuccessful()
            ->assertViewHas('unreadCount', 1)
            ->assertSee('My unread notification')
            ->assertSee('My read notification')
            ->assertDontSee('Another administrators private notification');
    }

    public function test_unread_count_includes_notifications_beyond_the_bounded_latest_list(): void
    {
        $admin = $this->admin();
        $oldest = $this->notice($admin, 'Older inbox item');
        $oldest->update(['created_at' => now()->subDay()]);
        for ($index = 0; $index < 20; $index++) {
            $this->notice($admin, 'Newer inbox item '.$index);
        }

        Livewire::actingAs($admin, 'web')->test(AdminNotifications::class)
            ->assertViewHas('unreadCount', 21)
            ->assertViewHas('notifications', fn ($notifications): bool => $notifications->count() === 20)
            ->assertDontSee('Older inbox item')
            ->assertSee('Newer inbox item 19');
    }

    public function test_marking_read_is_scoped_to_the_current_user_and_preserves_existing_read_times(): void
    {
        $admin = $this->admin();
        $own = $this->notice($admin, 'Own item');
        $foreign = $this->notice($this->admin(), 'Foreign item');
        $component = Livewire::actingAs($admin, 'web')->test(AdminNotifications::class);

        $component->call('markAsRead', $foreign->id)->assertViewHas('unreadCount', 1);
        $this->assertNull($foreign->fresh()->read_at);
        $component->call('markAsRead', 'invalid-notification-id')->assertSuccessful();
        $this->assertNull($own->fresh()->read_at);
        $component->call('markAsRead', $own->id)->assertViewHas('unreadCount', 0);
        $readAt = $own->fresh()->read_at;
        $this->assertNotNull($readAt);
        $this->travel(5)->minutes();
        $component->call('markAsRead', $own->id)->assertSuccessful();
        $this->assertTrue($readAt->equalTo($own->fresh()->read_at));
        $this->assertDatabaseHas('notifications', ['id' => $foreign->id, 'read_at' => null]);
    }

    public function test_mark_all_read_affects_only_current_users_unread_items(): void
    {
        $admin = $this->admin();
        $first = $this->notice($admin, 'First unread');
        $second = $this->notice($admin, 'Second unread');
        $alreadyRead = $this->notice($admin, 'Already read');
        $alreadyRead->update(['read_at' => now()->subDay()]);
        $originalReadAt = $alreadyRead->fresh()->read_at;
        $foreign = $this->notice($this->admin(), 'Foreign unread');

        Livewire::actingAs($admin, 'web')->test(AdminNotifications::class)
            ->call('markAllAsRead')->assertViewHas('unreadCount', 0);

        $this->assertNotNull($first->fresh()->read_at);
        $this->assertNotNull($second->fresh()->read_at);
        $this->assertTrue($originalReadAt->equalTo($alreadyRead->fresh()->read_at));
        $this->assertNull($foreign->fresh()->read_at);
        $this->assertDatabaseHas('notifications', ['id' => $first->id]);
        $this->assertDatabaseHas('notifications', ['id' => $second->id]);
    }

    public function test_inbox_rejects_guests_and_users_without_current_panel_access(): void
    {
        Livewire::test(AdminNotifications::class)->assertUnauthorized();

        $user = User::factory()->create();
        Livewire::actingAs($user, 'web')->test(AdminNotifications::class)->assertForbidden();

        $admin = $this->admin();
        $notice = $this->notice($admin, 'Protected notification');
        $component = Livewire::actingAs($admin, 'web')->test(AdminNotifications::class);
        $admin->update(['status' => 'SUSPENDED']);
        $component->call('markAsRead', $notice->id)->assertForbidden();
        $this->assertNull($notice->fresh()->read_at);
    }

    public function test_notifications_use_current_locale_escape_content_and_do_not_render_stored_action_urls(): void
    {
        $admin = $this->admin();
        $notice = $this->notice($admin, 'Original English message');
        $notice->update([
            'title' => 'Original title',
            'body' => 'Original body',
            'translations' => [
                'km' => ['title' => 'ចំណងជើងខ្មែរ'],
                'en' => ['body' => '<img src=x onerror=alert(1)>'],
            ],
            'action_path' => 'javascript:alert(1)',
        ]);
        app()->setLocale('km');

        Livewire::actingAs($admin, 'web')->test(AdminNotifications::class)
            ->assertSee('ចំណងជើងខ្មែរ')
            ->assertSee('&lt;img src=x onerror=alert(1)&gt;', false)
            ->assertDontSee('<img src=x onerror=alert(1)>', false)
            ->assertDontSee('javascript:alert(1)', false);
    }

    public function test_admin_header_has_flag_switch_notification_bell_and_native_profile_menu(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin, 'web')->get('/admin')
            ->assertOk()
            ->assertSee('admin-language-toggle', false)
            ->assertSee('admin-notifications-trigger', false)
            ->assertSee('fi-user-menu-trigger', false)
            ->assertDontSee('<select', false);
    }

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('ADMIN');

        return $admin;
    }

    private function notice(User $recipient, string $message): Notification
    {
        $event = app(BusinessEvents::class)->record(
            'admin.updated',
            'user',
            (string) Str::uuid(),
            null,
            recipient: $recipient,
            data: ['message' => $message],
        );

        return Notification::where('outbox_event_id', $event->id)->firstOrFail();
    }
}

<?php

namespace Tests\Feature;

use App\Filament\Resources\NotificationTemplateResource\ManageRecords;
use App\Filament\Resources\UserResource\ManageRecords as ManageUsers;
use App\Filament\Widgets\PlatformStats;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationItem;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AdminNavigationTest extends TestCase
{
    use DatabaseTransactions;

    #[TestWith(['en', ['Company intake', 'Documents', 'Website content', 'Access management', 'Settings']])]
    #[TestWith(['km', ['ការទទួលសំណើក្រុមហ៊ុន', 'ឯកសារ', 'មាតិកាគេហទំព័រ', 'ការគ្រប់គ្រងសិទ្ធិចូលប្រើ', 'ការកំណត់']])]
    public function test_default_sidebar_contains_only_frontend_administration_in_order(string $locale, array $groups): void
    {
        $admin = $this->user('ADMIN', $locale);

        $this->actingAs($admin)->get('/admin')->assertOk();

        $this->assertSame([
            '' => ['/admin'],
            $groups[0] => ['/admin/company-requests'],
            $groups[1] => ['/admin/documents', '/admin/document-versions'],
            $groups[2] => ['/admin/public-pages'],
            $groups[3] => ['/admin/users', '/admin/roles', '/admin/permissions'],
            $groups[4] => ['/admin/notification-templates', '/admin/system-settings', '/admin/settings/security'],
        ], $this->navigation());
    }

    public function test_removed_admin_modules_return_404_even_with_stale_operational_configuration(): void
    {
        config(['devmasters.show_operational_navigation' => true]);
        $this->actingAs($this->user('ADMIN'));

        foreach (['organizations', 'contacts', 'request-roles', 'request-activities', 'expert-profiles', 'expert-reviews', 'availabilities', 'skills', 'candidates', 'outreach-records', 'expert-offers', 'offer-versions', 'offer-responses', 'selection-decisions', 'placements', 'notifications', 'outbox-events', 'delivery-attempts', 'audit-events', 'export-jobs', 'services'] as $slug) {
            $this->get('/admin/'.$slug)->assertNotFound();
        }
        $this->assertCount(9, Filament::getPanel('admin')->getResources());
    }

    public function test_default_staff_sidebar_keeps_request_and_file_management_without_privileged_menus(): void
    {
        $staff = $this->user('STAFF');

        $this->actingAs($staff)->get('/admin')->assertOk();

        $this->assertSame([
            '' => ['/admin'],
            'Company intake' => ['/admin/company-requests'],
            'Documents' => ['/admin/documents', '/admin/document-versions'],
            'Settings' => ['/admin/settings/security'],
        ], $this->navigation());
    }

    public function test_retained_resource_routes_remain_available_to_administrators(): void
    {
        $this->actingAs($this->user('ADMIN'));

        foreach (['company-requests', 'documents', 'document-versions', 'public-pages', 'users', 'roles', 'permissions', 'notification-templates', 'system-settings'] as $slug) {
            $this->get('/admin/'.$slug)->assertOk();
        }
    }

    #[TestWith(['notification-templates'])]
    #[TestWith(['system-settings'])]
    #[TestWith(['users'])]
    #[TestWith(['roles'])]
    #[TestWith(['permissions'])]
    public function test_staff_cannot_access_privileged_resource_routes(string $slug): void
    {
        $staff = $this->user('STAFF');

        $this->actingAs($staff)->get('/admin/'.$slug)->assertForbidden();
    }

    public function test_retained_resources_require_authentication(): void
    {
        $this->get('/admin/company-requests')->assertRedirect('/admin/login');
    }

    public function test_user_list_paginates_filtered_records_and_preserves_search_when_page_size_changes(): void
    {
        $admin = $this->user('ADMIN');
        $prefix = 'Pagination '.$admin->getKey();
        $users = User::factory()->count(26)
            ->sequence(fn (Sequence $sequence): array => ['display_name' => $prefix.' '.sprintf('%02d', $sequence->index + 1)])
            ->create(['status' => 'ACTIVE']);
        $suspended = User::factory()->create(['display_name' => $prefix.' 00', 'status' => 'SUSPENDED']);
        $unrelated = User::factory()->create(['display_name' => 'Outside the pagination search', 'status' => 'ACTIVE']);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();

        $component = Livewire::actingAs($admin)->test(ManageUsers::class)
            ->assertSuccessful()
            ->searchTable($prefix)
            ->filterTable('status', 'ACTIVE')
            ->sortTable('display_name', 'asc')
            ->assertCountTableRecords(26)
            ->assertCanSeeTableRecords($users->take(10), inOrder: true)
            ->assertCanNotSeeTableRecords($users->slice(10))
            ->assertCanNotSeeTableRecords([$suspended, $unrelated]);

        $component->call('gotoPage', 2)
            ->assertCanSeeTableRecords($users->slice(10, 10), inOrder: true)
            ->assertCanNotSeeTableRecords($users->take(10))
            ->assertCanNotSeeTableRecords($users->slice(20));

        $component->set('tableRecordsPerPage', 25)
            ->assertCountTableRecords(26)
            ->assertCanSeeTableRecords($users->take(25), inOrder: true)
            ->assertCanNotSeeTableRecords($users->slice(25))
            ->assertCanNotSeeTableRecords([$suspended, $unrelated])
            ->mountTableAction('inspect', $users->first())
            ->assertActionMounted(TestAction::make('inspect')->table($users->first()));
    }

    public function test_revoking_resource_access_also_forbids_livewire_updates_to_an_open_page(): void
    {
        $user = $this->user('ADMIN');
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        $component = Livewire::actingAs($user)->test(ManageRecords::class)
            ->assertSuccessful();
        $user->syncRoles(['STAFF']);

        $component->call('$refresh')->assertForbidden();
    }

    public function test_default_dashboard_stats_focus_on_public_requests(): void
    {
        $this->actingAs($this->user('ADMIN'));

        Livewire::test(PlatformStats::class)
            ->assertSee('Requests to review')
            ->assertDontSee('Expert applications')
            ->assertDontSee('Open offers')
            ->assertDontSee('Current placements');
    }

    public function test_dashboard_request_stats_are_hidden_from_roles_without_request_permission(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $role = Role::create(['code' => 'NAV_OFFER_REVIEWER', 'name' => 'NAV_OFFER_REVIEWER', 'guard_name' => 'web']);
        $role->givePermissionTo(['admin.access', 'offers.prepare']);
        $user = User::factory()->create();
        $user->assignRole($role);
        $this->actingAs($user);

        $this->assertFalse(PlatformStats::canView());
        config(['devmasters.show_operational_navigation' => true]);
        $this->assertFalse(PlatformStats::canView());
    }

    private function user(string $role, string $locale = 'en'): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $user = User::factory()->create(['preferred_locale' => $locale]);
        $user->assignRole($role);

        return $user;
    }

    /** @return array<string, list<string>> */
    private function navigation(): array
    {
        return collect(Filament::getNavigation())->mapWithKeys(fn (NavigationGroup $group): array => [
            $group->getLabel() ?? '' => collect($group->getItems())
                ->map(fn (NavigationItem $item): string => parse_url($item->getUrl(), PHP_URL_PATH))
                ->values()->all(),
        ])->all();
    }
}

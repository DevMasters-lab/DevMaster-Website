<?php

namespace Tests\Feature;

use App\Filament\Resources\CompanyRequestResource;
use App\Filament\Resources\DocumentResource;
use App\Filament\Resources\DocumentVersionResource;
use App\Filament\Resources\NotificationTemplateResource;
use App\Filament\Resources\PublicPageResource;
use App\Filament\Resources\PublicPageResource\ManageRecords as ManagePages;
use App\Filament\Resources\RoleResource;
use App\Filament\Resources\RoleResource\ManageRecords as ManageRoles;
use App\Filament\Resources\SystemSettingResource;
use App\Filament\Resources\UserResource;
use App\Models\CompanyRequest;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\NotificationTemplate;
use App\Models\PublicPage;
use App\Models\Role;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\AccessManagementService;
use App\Services\ConfigurationService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\Testing\TestAction;
use Filament\Facades\Filament;
use Filament\Navigation\NavigationGroup;
use Filament\Navigation\NavigationItem;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Livewire\Livewire;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AdminCrudPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    private const MODULES = [
        'requests' => [CompanyRequestResource::class, CompanyRequest::class],
        'documents' => [DocumentResource::class, Document::class],
        'document_versions' => [DocumentVersionResource::class, DocumentVersion::class],
        'content' => [PublicPageResource::class, PublicPage::class],
        'users' => [UserResource::class, User::class],
        'roles' => [RoleResource::class, Role::class],
        'notifications' => [NotificationTemplateResource::class, NotificationTemplate::class],
        'settings' => [SystemSettingResource::class, SystemSetting::class],
    ];

    #[DataProvider('sidebarModules')]
    public function test_each_view_permission_opens_only_its_matching_resource_and_grants_no_mutation(string $module): void
    {
        $user = $this->userWithPermissions([$module.'.view']);

        foreach (self::MODULES as $target => [$resource, $model]) {
            $this->assertSame($target === $module, $resource::canViewAny(), $target.' resource visibility');
            $this->assertSame($target === $module, Gate::forUser($user)->allows('viewAny', $model), $target.' view policy');
        }

        [$resource, $model] = self::MODULES[$module];
        $this->assertFalse($resource::canCreate());
        $this->assertFalse(Gate::forUser($user)->allows('create', $model));
        $this->assertFalse(Gate::forUser($user)->allows('update', new $model));
        $this->assertFalse(Gate::forUser($user)->allows('delete', new $model));
    }

    public function test_content_view_only_role_sees_its_menu_but_cannot_mutate_content(): void
    {
        $user = $this->userWithPermissions(['content.view']);
        $page = PublicPage::create($this->pageData('crud-view-only') + ['updated_by_user_id' => $user->id]);

        $this->get('/admin/public-pages')->assertOk();
        Livewire::test(ManagePages::class)
            ->assertActionHidden('createPage')
            ->assertActionHidden(TestAction::make('editContent')->table($page));
        $this->assertThrows(
            fn () => app(ConfigurationService::class)->page($user, $this->pageData($page->slug, 'Unauthorized change'), $page),
            AuthorizationException::class,
        );

        $this->assertDatabaseHas('public_pages', ['id' => $page->id, 'title' => 'Original content']);
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $page->id, 'action' => 'public_pages.updated']);
    }

    public function test_content_create_permission_cannot_update_an_existing_page(): void
    {
        $user = $this->userWithPermissions(['content.view', 'content.create']);
        $service = app(ConfigurationService::class);

        $page = $service->page($user, $this->pageData('crud-create-only'));
        Livewire::test(ManagePages::class)
            ->assertActionVisible('createPage')
            ->assertActionHidden(TestAction::make('editContent')->table($page));
        $this->assertThrows(
            fn () => $service->page($user, $this->pageData($page->slug, 'Unauthorized change'), $page),
            AuthorizationException::class,
        );

        $this->assertDatabaseHas('public_pages', ['id' => $page->id, 'title' => 'Original content']);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $page->id, 'action' => 'public_pages.created', 'actor_user_id' => $user->id]);
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $page->id, 'action' => 'public_pages.updated']);
    }

    public function test_content_update_permission_cannot_create_a_page(): void
    {
        $user = $this->userWithPermissions(['content.view', 'content.update']);
        $page = PublicPage::create($this->pageData('crud-update-only') + ['updated_by_user_id' => $user->id]);
        $service = app(ConfigurationService::class);

        $service->page($user, $this->pageData($page->slug, 'Updated content'), $page);
        Livewire::test(ManagePages::class)
            ->assertActionHidden('createPage')
            ->assertActionVisible(TestAction::make('editContent')->table($page));
        $this->assertThrows(fn () => $service->page($user, $this->pageData('crud-forbidden-create')), AuthorizationException::class);

        $this->assertDatabaseHas('public_pages', ['id' => $page->id, 'title' => 'Updated content']);
        $this->assertDatabaseMissing('public_pages', ['slug' => 'crud-forbidden-create']);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $page->id, 'action' => 'public_pages.updated', 'actor_user_id' => $user->id]);
    }

    public function test_role_create_permission_does_not_allow_editing_custom_roles(): void
    {
        $user = $this->userWithPermissions(['roles.view', 'roles.create']);
        $service = app(AccessManagementService::class);

        $role = $service->createRole($user, ['code' => 'CRUD_CREATE_ONLY', 'name' => 'Create only custom role', 'permission_ids' => []]);
        Livewire::test(ManageRoles::class)
            ->assertActionVisible('create')
            ->assertActionHidden(TestAction::make('edit')->table($role));
        $this->get('/admin/roles/'.$role->getRouteKey().'/edit')->assertForbidden();
        $this->assertThrows(fn () => $service->updateRole($user, $role, [
            'record_version' => $role->record_version,
            'name' => 'Unauthorized role edit',
            'is_active' => true,
            'permission_ids' => [],
        ]), AuthorizationException::class);

        $this->assertDatabaseHas('roles', ['id' => $role->id, 'name' => 'Create only custom role']);
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $role->id, 'action' => 'role.updated']);
    }

    public function test_user_creation_and_updates_with_role_view_permission_cannot_assign_privileged_roles(): void
    {
        $user = $this->userWithPermissions(['users.view', 'users.create', 'users.update', 'roles.view']);
        $target = User::factory()->create();
        $target->assignRole('STAFF');
        $adminRole = Role::where('code', 'ADMIN')->firstOrFail();
        $service = app(AccessManagementService::class);

        $this->get('/admin/users')->assertOk();
        $this->assertThrows(fn () => $service->inviteStaff($user, [
            'display_name' => 'Unauthorized administrator',
            'email' => 'crud-unauthorized-invite@example.test',
            'role_ids' => [$adminRole->id],
        ]), AuthorizationException::class);
        $this->assertThrows(fn () => $service->assignRoles($user, $target, [$adminRole->id]), AuthorizationException::class);

        $this->assertDatabaseMissing('users', ['email' => 'crud-unauthorized-invite@example.test']);
        $this->assertSame(['STAFF'], $target->fresh()->roles()->pluck('code')->all());
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $target->id, 'action' => 'user.roles-changed']);
    }

    #[TestWith(['documents.view', '/admin/documents', '/admin/document-versions'])]
    #[TestWith(['document_versions.view', '/admin/document-versions', '/admin/documents'])]
    public function test_document_and_version_permissions_control_separate_navigation_and_routes(string $permission, string $allowedPath, string $deniedPath): void
    {
        $this->userWithPermissions([$permission]);

        $this->get($allowedPath)->assertOk();
        $paths = collect(Filament::getNavigation())
            ->flatMap(fn (NavigationGroup $group): array => collect($group->getItems())
                ->map(fn (NavigationItem $item): string => parse_url($item->getUrl(), PHP_URL_PATH))->all())
            ->all();
        $this->get($deniedPath)->assertForbidden();

        $this->assertContains($allowedPath, $paths);
        $this->assertNotContains($deniedPath, $paths);
    }

    public function test_legacy_manage_permissions_cannot_bypass_sidebar_crud_permissions(): void
    {
        $user = $this->userWithPermissions(['users.manage', 'roles.manage', 'requests.manage', 'content.manage', 'notifications.manage', 'settings.manage']);

        foreach (['users', 'roles', 'requests', 'content', 'notifications', 'settings'] as $module) {
            [$resource, $model] = self::MODULES[$module];
            $this->assertFalse($resource::canViewAny(), $module.' resource visibility');
            $this->assertFalse(Gate::forUser($user)->allows('viewAny', $model), $module.' view policy');
        }
        $this->get('/admin/roles/create')->assertForbidden();
        $this->assertThrows(fn () => app(AccessManagementService::class)->createRole($user, [
            'code' => 'CRUD_LEGACY_DENIED', 'name' => 'Legacy rights rejected', 'permission_ids' => [],
        ]), AuthorizationException::class);

        $this->assertDatabaseMissing('roles', ['code' => 'CRUD_LEGACY_DENIED']);
    }

    public function test_notification_create_permission_cannot_replace_an_existing_template(): void
    {
        $user = $this->userWithPermissions(['notifications.create']);
        $service = app(ConfigurationService::class);
        $data = $this->templateData('crud-create-only');

        $template = $service->template($user, $data);
        $this->assertThrows(fn () => $service->template($user, [...$data, 'body' => 'Unauthorized replacement']), AuthorizationException::class);

        $this->assertSame(1, NotificationTemplate::where('template_key', $data['template_key'])->count());
        $this->assertDatabaseHas('notification_templates', ['id' => $template->id, 'body' => 'Original template', 'version_no' => 1, 'is_active' => true]);
    }

    public function test_notification_update_permission_appends_a_version_without_changing_published_content_or_creating_a_new_key(): void
    {
        $user = $this->userWithPermissions(['notifications.update']);
        $data = $this->templateData('crud-update-only');
        $original = NotificationTemplate::create($data + ['version_no' => 1, 'published_at' => now(), 'created_by_user_id' => $user->id]);
        $service = app(ConfigurationService::class);

        $replacement = $service->template($user, [...$data, 'body' => 'Replacement template']);
        $this->assertThrows(fn () => $service->template($user, $this->templateData('crud-forbidden-new-key')), AuthorizationException::class);

        $this->assertDatabaseHas('notification_templates', ['id' => $original->id, 'body' => 'Original template', 'version_no' => 1, 'is_active' => false]);
        $this->assertDatabaseHas('notification_templates', ['id' => $replacement->id, 'body' => 'Replacement template', 'version_no' => 2, 'is_active' => true]);
        $this->assertDatabaseMissing('notification_templates', ['template_key' => 'crud-forbidden-new-key']);
    }

    public function test_setting_create_permission_cannot_update_an_existing_setting(): void
    {
        $user = $this->userWithPermissions(['settings.create']);
        $service = app(ConfigurationService::class);

        $setting = $service->setting($user, 'website.announcement', ['text' => 'Original announcement'], 'Public announcement');
        $this->assertThrows(fn () => $service->setting($user, $setting->key, ['text' => 'Unauthorized change'], 'Changed'), AuthorizationException::class);

        $this->assertSame(['text' => 'Original announcement'], $setting->fresh()->value);
        $this->assertDatabaseMissing('audit_events', ['entity_id' => $setting->id, 'action' => 'system_settings.updated']);
    }

    public function test_setting_update_permission_cannot_create_a_setting(): void
    {
        $user = $this->userWithPermissions(['settings.update']);
        $setting = SystemSetting::create(['key' => 'website.announcement', 'value' => ['text' => 'Original announcement'], 'description' => 'Public announcement', 'updated_by_user_id' => $user->id]);
        $service = app(ConfigurationService::class);

        $service->setting($user, $setting->key, ['text' => 'Updated announcement'], 'Public announcement');
        $this->assertThrows(fn () => $service->setting($user, 'business.display_name', ['text' => 'Unauthorized creation'], 'Business name'), AuthorizationException::class);

        $this->assertSame(['text' => 'Updated announcement'], $setting->fresh()->value);
        $this->assertDatabaseMissing('system_settings', ['key' => 'business.display_name']);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $setting->id, 'action' => 'system_settings.updated', 'actor_user_id' => $user->id]);
    }

    public function test_granular_mutation_permissions_keep_file_versions_and_published_templates_protected(): void
    {
        $user = $this->userWithPermissions(['document_versions.view', 'document_versions.update', 'document_versions.delete', 'notifications.view', 'notifications.update', 'notifications.delete']);
        $document = Document::create(['title' => 'Evidence', 'document_type' => 'OTHER', 'created_by_user_id' => $user->id]);
        $version = DocumentVersion::create([
            'document_id' => $document->id,
            'version_no' => 1,
            'original_filename' => 'evidence.pdf',
            'bucket_name' => 'test-documents',
            'object_key' => 'crud/evidence.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
            'sha256' => str_repeat('a', 64),
            'scan_status' => 'CLEAN',
            'scanned_at' => now(),
            'uploaded_by_user_id' => $user->id,
        ]);
        $template = NotificationTemplate::create($this->templateData('crud-published-protected') + ['version_no' => 1, 'published_at' => now(), 'created_by_user_id' => $user->id]);

        $this->assertTrue(Gate::forUser($user)->allows('view', $version));
        $this->assertTrue(Gate::forUser($user)->allows('view', $template));
        foreach ([$version, $template] as $record) {
            $this->assertFalse(Gate::forUser($user)->allows('update', $record));
            $this->assertFalse(Gate::forUser($user)->allows('delete', $record));
        }
        $this->assertFalse(DocumentVersionResource::canEdit($version));
        $this->assertFalse(DocumentVersionResource::canDelete($version));
        $this->assertFalse(NotificationTemplateResource::canEdit($template));
        $this->assertFalse(NotificationTemplateResource::canDelete($template));
    }

    public function test_suspended_users_cannot_use_granular_sidebar_permissions(): void
    {
        $user = $this->userWithPermissions([
            'requests.view', 'documents.view', 'document_versions.view', 'content.view', 'users.view', 'roles.view', 'notifications.view', 'settings.view', 'content.create',
        ], 'SUSPENDED');

        foreach (self::MODULES as $module => [$resource, $model]) {
            $this->assertFalse($resource::canViewAny(), $module.' resource visibility for a suspended user');
            $this->assertFalse(Gate::forUser($user)->allows('viewAny', $model), $module.' view policy for a suspended user');
        }
        $this->get('/admin/public-pages')->assertForbidden();

        $this->assertFalse($user->canAccessPanel(Filament::getPanel('admin')));
    }

    public function test_suspended_users_cannot_create_content_through_the_service(): void
    {
        $user = $this->userWithPermissions(['content.create'], 'SUSPENDED');

        $this->assertThrows(fn () => app(ConfigurationService::class)->page($user, $this->pageData('crud-suspended')), AuthorizationException::class);

        $this->assertDatabaseMissing('public_pages', ['slug' => 'crud-suspended']);
    }

    /** @return array<string, array{string}> */
    public static function sidebarModules(): array
    {
        return [
            'requests' => ['requests'],
            'documents' => ['documents'],
            'document versions' => ['document_versions'],
            'content' => ['content'],
            'users' => ['users'],
            'roles' => ['roles'],
            'notifications' => ['notifications'],
            'settings' => ['settings'],
        ];
    }

    private function userWithPermissions(array $permissions, string $status = 'ACTIVE'): User
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        $code = 'CRUD_'.Str::upper(Str::random(12));
        $role = Role::create(['code' => $code, 'name' => $code, 'guard_name' => 'web', 'is_system' => false, 'is_active' => true]);
        $role->givePermissionTo(array_unique(['admin.access', ...$permissions]));
        $user = User::factory()->create(['status' => $status, 'email' => 'crud-'.Str::uuid().'@example.test']);
        $user->assignRole($role);
        $this->actingAs($user);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();

        return $user;
    }

    /** @return array<string, string> */
    private function pageData(string $slug, string $title = 'Original content'): array
    {
        return ['slug' => $slug, 'locale' => 'en', 'title' => $title, 'body_markdown' => 'Page content', 'status' => 'DRAFT'];
    }

    /** @return array<string, bool|string> */
    private function templateData(string $key): array
    {
        return ['template_key' => $key, 'channel' => 'EMAIL', 'locale' => 'en', 'subject' => 'Test notification', 'body' => 'Original template', 'is_active' => true];
    }
}

<?php

declare(strict_types=1);
use App\Filament\Pages\RequestPasswordReset;
use App\Filament\Pages\ResetPassword;
use App\Filament\Pages\Security;
use App\Filament\Resources\CompanyRequestResource;
use App\Filament\Resources\DocumentResource;
use App\Filament\Resources\DocumentVersionResource;
use App\Filament\Resources\NotificationTemplateResource;
use App\Filament\Resources\PublicPageResource;
use App\Filament\Resources\RoleResource;
use App\Filament\Resources\SystemSettingResource;
use App\Filament\Resources\UserResource;
use App\Filament\Widgets\PlatformStats;
use App\Filament\Widgets\RequestVolume;
use App\Models\User;
use App\Support\AdminPermissions;
use Filament\Pages\Dashboard;
use Filament\Widgets\AccountWidget;
use Filament\Widgets\FilamentInfoWidget;

return [

    /*
    |--------------------------------------------------------------------------
    | Shield Resource
    |--------------------------------------------------------------------------
    |
    | Here you may configure the built-in role management resource. You can
    | customize the URL, choose whether to show model paths, group it under
    | a cluster, and decide which permission tabs to display.
    |
    */

    'shield_resource' => [
        'slug' => 'roles',
        'show_model_path' => false,
        'cluster' => null,
        'tabs' => [
            'pages' => false,
            'widgets' => false,
            'resources' => false,
            'custom_permissions' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Multi-Tenancy
    |--------------------------------------------------------------------------
    |
    | When your application supports teams, Shield will automatically detect
    | and configure the tenant model during setup. This enables tenant-scoped
    | roles and permissions throughout your application.
    |
    */

    'tenant_model' => null,

    /*
    |--------------------------------------------------------------------------
    | User Model
    |--------------------------------------------------------------------------
    |
    | This value contains the class name of your user model. This model will
    | be used for role assignments and must implement the HasRoles trait
    | provided by the Spatie\Permission package.
    |
    */

    'auth_provider_model' => User::class,

    /*
    |--------------------------------------------------------------------------
    | Super Admin
    |--------------------------------------------------------------------------
    |
    | Here you may define a super admin that has unrestricted access to your
    | application. You can choose to implement this via Laravel's gate system
    | or as a traditional role with all permissions explicitly assigned.
    |
    */

    'super_admin' => [
        'enabled' => false,
        'name' => 'super_admin',
        'define_via_gate' => false,
        'intercept_gate' => 'before',
    ],

    /*
    |--------------------------------------------------------------------------
    | Panel User
    |--------------------------------------------------------------------------
    |
    | When enabled, Shield will create a basic panel user role that can be
    | assigned to users who should have access to your Filament panels but
    | don't need any specific permissions beyond basic authentication.
    |
    */

    'panel_user' => [
        'enabled' => false,
        'name' => 'panel_user',
    ],

    /*
    |--------------------------------------------------------------------------
    | Permission Builder
    |--------------------------------------------------------------------------
    |
    | You can customize how permission keys are generated to match your
    | preferred naming convention and organizational standards. Shield uses
    | these settings when creating permission names from your resources.
    |
    | Supported formats: snake, kebab, pascal, camel, upper_snake, lower_snake
    |
    | Note: The separator must not conflict with the case format's own
    | delimiter. For example, `_` cannot be used with snake/lower_snake/
    | upper_snake, and `-` cannot be used with kebab.
    |
    | When `format_custom_permission_keys` is true (default), custom
    | permissions defined below will have their keys formatted according to
    | the case setting. If your custom permissions come from external sources
    | (e.g. Terraform, Keycloak) and must remain unchanged, set this to false.
    | When using the separator in custom permission definitions, each segment
    | will be formatted independently (e.g. 'view:system_log' with pascal
    | case becomes 'View:SystemLog').
    |
    */

    'permissions' => [
        'separator' => ':',
        'case' => 'pascal',
        'generate' => false,
        'format_custom_permission_keys' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Policies
    |--------------------------------------------------------------------------
    |
    | Shield can automatically generate Laravel policies for your resources.
    | Generated policies mirror each model's location: models under
    | app/Models map into the path below (keeping their nesting), models in
    | any other "Models" directory get a sibling "Policies" directory, and
    | vendor models fall back to the path below. When merge is enabled, the
    | methods below will be combined with any resource-specific methods you
    | define in the resources section.
    |
    */

    'policies' => [
        'path' => app_path('Policies'),
        'merge' => true,
        'generate' => false,
        'methods' => [],
        'single_parameter_methods' => [
            'viewAny',
            'create',
            'deleteAny',
            'forceDeleteAny',
            'restoreAny',
            'reorder',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Localization
    |--------------------------------------------------------------------------
    |
    | Shield supports multiple languages out of the box. When enabled, you
    | can provide translated labels for permissions to create a more
    | localized experience for your international users.
    |
    */

    'localization' => [
        'enabled' => true,
        'key' => 'filament-shield::filament-shield.permission_labels',
    ],

    /*
    |--------------------------------------------------------------------------
    | Resources
    |--------------------------------------------------------------------------
    |
    | Here you can fine-tune permissions for specific Filament resources.
    | Use the 'manage' array to override the default policy methods for
    | individual resources, giving you granular control over permissions.
    |
    */

    'resources' => [
        'subject' => 'model',
        'manage' => [],
        'exclude' => [
            CompanyRequestResource::class,
            DocumentResource::class,
            DocumentVersionResource::class,
            PublicPageResource::class,
            UserResource::class,
            RoleResource::class,
            NotificationTemplateResource::class,
            SystemSettingResource::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Pages
    |--------------------------------------------------------------------------
    |
    | Most Filament pages only require view permissions. Pages listed in the
    | exclude array will be skipped during permission generation and won't
    | appear in your role management interface.
    |
    */

    'pages' => [
        'subject' => 'class',
        'prefix' => 'view',
        'exclude' => [
            Dashboard::class,
            Security::class,
            RequestPasswordReset::class,
            ResetPassword::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Widgets
    |--------------------------------------------------------------------------
    |
    | Like pages, widgets typically only need view permissions. Add widgets
    | to the exclude array if you don't want them to appear in your role
    | management interface.
    |
    */

    'widgets' => [
        'subject' => 'class',
        'prefix' => 'view',
        'exclude' => [
            AccountWidget::class,
            FilamentInfoWidget::class,
            PlatformStats::class,
            RequestVolume::class,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Permissions
    |--------------------------------------------------------------------------
    |
    | Only permissions for the current admin sidebar are editable here.
    | Portal access also covers the Dashboard and account Security page.
    | Other workflow permissions remain managed by the application.
    |
    | Keys are formatted per the Permission Builder settings above; set
    | permissions.format_custom_permission_keys to false to use them as-is.
    |
    */

    'custom_permissions' => AdminPermissions::definitions(),

    /*
    |--------------------------------------------------------------------------
    | Entity Discovery
    |--------------------------------------------------------------------------
    |
    | By default, Shield only looks for entities in your default Filament
    | panel. Enable these options if you're using multiple panels and want
    | Shield to discover entities across all of them.
    |
    */

    'discovery' => [
        'discover_all_resources' => false,
        'discover_all_widgets' => false,
        'discover_all_pages' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Role Policy
    |--------------------------------------------------------------------------
    |
    | Shield can automatically register a policy for role management itself.
    | This lets you control who can manage roles using Laravel's built-in
    | authorization system. Requires a RolePolicy class in your app.
    |
    */

    'register_role_policy' => false,

];

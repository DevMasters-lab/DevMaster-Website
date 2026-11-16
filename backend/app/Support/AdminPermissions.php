<?php

namespace App\Support;

class AdminPermissions
{
    public const MODULES = [
        'company_requests' => 'requests',
        'documents' => 'documents',
        'document_versions' => 'document_versions',
        'public_pages' => 'content',
        'users' => 'users',
        'roles' => 'roles',
        'notification_templates' => 'notifications',
        'system_settings' => 'settings',
    ];

    /** @return array<string, string> */
    public static function definitions(): array
    {
        $permissions = ['admin.access' => 'Admin portal access'];

        foreach (self::MODULES as $module) {
            foreach (['view', 'create', 'update', 'delete'] as $action) {
                $permissions[$module.'.'.$action] = ucfirst($action);
            }
        }

        return $permissions;
    }

    /** @return array<string, list<string>> */
    public static function legacyGrants(): array
    {
        $grants = [];

        foreach (['users', 'roles', 'requests', 'notifications', 'content', 'settings'] as $module) {
            $grants[$module.'.manage'] = [$module.'.view', $module.'.create', $module.'.update'];
        }

        $grants['documents.view'] = ['documents.create', 'document_versions.view'];

        return $grants;
    }
}

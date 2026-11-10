<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $permissions = ['admin.access', 'users.manage', 'roles.manage', 'crm.manage', 'requests.manage', 'experts.review', 'experts.activate', 'experts.manage', 'matching.manage', 'offers.prepare', 'offers.issue', 'offers.record-response', 'selections.decide', 'placements.manage', 'documents.view', 'notifications.manage', 'content.manage', 'audit.view', 'settings.manage', 'reports.export'];
        foreach ($permissions as $code) {
            Permission::firstOrCreate(['name' => $code, 'guard_name' => 'web'], ['code' => $code, 'module' => explode('.', $code)[0], 'description' => $code]);
        }
        foreach (['ADMIN', 'STAFF', 'EXPERT'] as $code) {
            $roles[$code] = Role::firstOrCreate(['name' => $code, 'guard_name' => 'web'], ['code' => $code, 'is_system' => true]);
        }
        $roles['ADMIN']->syncPermissions($permissions);
        $roles['STAFF']->syncPermissions(['admin.access', 'crm.manage', 'requests.manage', 'experts.manage', 'matching.manage', 'offers.prepare', 'documents.view']);
    }
}

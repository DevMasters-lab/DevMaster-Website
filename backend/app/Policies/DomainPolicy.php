<?php

namespace App\Policies;

use App\Models\User;
use App\Support\AdminPermissions;
use Illuminate\Database\Eloquent\Model;

class DomainPolicy
{
    public const MODULES = ['users' => 'users.manage', 'roles' => 'roles.manage', 'permissions' => 'roles.manage', 'organizations' => 'crm.manage', 'contacts' => 'crm.manage', 'company_requests' => 'requests.manage', 'request_roles' => 'requests.manage', 'request_activities' => 'requests.manage', 'expert_profiles' => 'experts.manage', 'expert_reviews' => 'experts.review', 'skills' => 'experts.manage', 'availabilities' => 'experts.manage', 'candidates' => 'matching.manage', 'outreach_records' => 'matching.manage', 'expert_offers' => 'offers.prepare', 'offer_versions' => 'offers.prepare', 'offer_responses' => 'offers.record-response', 'selection_decisions' => 'selections.decide', 'placements' => 'placements.manage', 'documents' => 'documents.view', 'document_versions' => 'documents.view', 'notifications' => 'notifications.manage', 'notification_templates' => 'notifications.manage', 'outbox_events' => 'notifications.manage', 'delivery_attempts' => 'notifications.manage', 'audit_events' => 'audit.view', 'services' => 'content.manage', 'public_pages' => 'content.manage', 'system_settings' => 'settings.manage', 'export_jobs' => 'reports.export'];

    public function __construct(public string $table) {}

    public function viewAny(User $u): bool
    {
        return $u->status === 'ACTIVE' && $u->can($this->permission('view'));
    }

    public function view(User $u, Model $m): bool
    {
        return $this->viewAny($u);
    }

    public function create(User $u): bool
    {
        if (isset(AdminPermissions::MODULES[$this->table])) {
            return $u->status === 'ACTIVE'
                && ! in_array($this->table, ['company_requests', 'document_versions'], true)
                && $u->can($this->permission('create'));
        }

        return $this->viewAny($u) && in_array($this->table, ['organizations', 'contacts', 'skills', 'services']);
    }

    public function update(User $u, Model $m): bool
    {
        if (isset(AdminPermissions::MODULES[$this->table])) {
            if ($this->table === 'roles' && ($m->is_system || $u->roles->contains('id', $m->getKey()))) {
                return false;
            }

            return $u->status === 'ACTIVE'
                && ! in_array($this->table, ['documents', 'document_versions', 'notification_templates'], true)
                && $u->can($this->permission('update'));
        }

        return $this->viewAny($u) && in_array($this->table, ['organizations', 'contacts', 'skills', 'services']);
    }

    public function delete(User $u, Model $m): bool
    {
        return $u->status === 'ACTIVE'
            && in_array($this->table, ['public_pages', 'system_settings'], true)
            && $u->can($this->permission('delete'));
    }

    public function deleteAny(User $u): bool
    {
        return false;
    }

    public function permission(string $operation = 'view'): string
    {
        if (isset(AdminPermissions::MODULES[$this->table])) {
            return AdminPermissions::MODULES[$this->table].'.'.$operation;
        }

        if (in_array($this->table, ['request_roles', 'request_activities'], true)) {
            return 'requests.'.$operation;
        }

        return self::MODULES[$this->table] ?? 'admin.access';
    }
}

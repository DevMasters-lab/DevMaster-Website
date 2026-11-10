<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class DomainPolicy
{
    public const MODULES = ['users' => 'users.manage', 'roles' => 'roles.manage', 'permissions' => 'roles.manage', 'organizations' => 'crm.manage', 'contacts' => 'crm.manage', 'company_requests' => 'requests.manage', 'request_roles' => 'requests.manage', 'request_activities' => 'requests.manage', 'expert_profiles' => 'experts.manage', 'expert_reviews' => 'experts.review', 'skills' => 'experts.manage', 'availabilities' => 'experts.manage', 'candidates' => 'matching.manage', 'outreach_records' => 'matching.manage', 'expert_offers' => 'offers.prepare', 'offer_versions' => 'offers.prepare', 'offer_responses' => 'offers.record-response', 'selection_decisions' => 'selections.decide', 'placements' => 'placements.manage', 'documents' => 'documents.view', 'document_versions' => 'documents.view', 'notifications' => 'notifications.manage', 'notification_templates' => 'notifications.manage', 'outbox_events' => 'notifications.manage', 'delivery_attempts' => 'notifications.manage', 'audit_events' => 'audit.view', 'services' => 'content.manage', 'public_pages' => 'content.manage', 'system_settings' => 'settings.manage', 'export_jobs' => 'reports.export'];

    public function __construct(public string $table) {}

    public function viewAny(User $u): bool
    {
        return $u->status === 'ACTIVE' && $u->can(self::MODULES[$this->table] ?? 'admin.access');
    }

    public function view(User $u, Model $m): bool
    {
        return $this->viewAny($u);
    }

    public function create(User $u): bool
    {
        return $this->viewAny($u) && in_array($this->table, ['organizations', 'contacts', 'skills', 'services']);
    }

    public function update(User $u, Model $m): bool
    {
        return $this->viewAny($u) && in_array($this->table, ['organizations', 'contacts', 'skills', 'services']);
    }

    public function delete(User $u, Model $m): bool
    {
        return false;
    }

    public function deleteAny(User $u): bool
    {
        return false;
    }
}

<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditTrail
{
    public function record(string $action, Model $record, ?User $actor, array $changes = [], ?string $reason = null): AuditEvent
    {
        return AuditEvent::create([
            'actor_user_id' => $actor?->id,
            'actor_type' => $actor ? 'USER' : 'SYSTEM',
            'action' => $action,
            'entity_type' => $record->getTable(),
            'entity_id' => $record->getKey(),
            'change_summary' => $changes,
            'reason' => $reason,
            'correlation_id' => (string) Str::uuid(),
        ]);
    }
}

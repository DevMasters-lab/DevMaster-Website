<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditEvent extends DomainModel
{
    protected $table = 'audit_events';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['record_version' => 'integer', 'change_summary' => 'array', 'occurred_at' => 'immutable_datetime'];
    }

    public function actorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}

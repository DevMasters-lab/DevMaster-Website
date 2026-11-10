<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class OutboxEvent extends DomainModel
{
    protected $table = 'outbox_events';

    protected function casts(): array
    {
        return ['aggregate_version' => 'integer', 'payload' => 'array', 'available_at' => 'immutable_datetime', 'locked_until' => 'immutable_datetime', 'publish_attempts' => 'integer', 'published_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function notificationsByOutboxEvent(): HasMany
    {
        return $this->hasMany(Notification::class, 'outbox_event_id');
    }

    public function deliveryAttemptsByOutboxEvent(): HasMany
    {
        return $this->hasMany(DeliveryAttempt::class, 'outbox_event_id');
    }
}

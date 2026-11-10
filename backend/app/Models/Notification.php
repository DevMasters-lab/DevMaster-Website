<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Notification extends DomainModel
{
    protected $table = 'notifications';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['translations' => 'array', 'read_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function recipientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function outboxEvent(): BelongsTo
    {
        return $this->belongsTo(OutboxEvent::class, 'outbox_event_id');
    }

    public function deliveryAttemptsByNotification(): HasMany
    {
        return $this->hasMany(DeliveryAttempt::class, 'notification_id');
    }
}

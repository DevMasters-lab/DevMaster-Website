<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeliveryAttempt extends DomainModel
{
    protected $table = 'delivery_attempts';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['attempt_no' => 'integer', 'attempted_at' => 'immutable_datetime', 'completed_at' => 'immutable_datetime'];
    }

    public function outboxEvent(): BelongsTo
    {
        return $this->belongsTo(OutboxEvent::class, 'outbox_event_id');
    }

    public function notification(): BelongsTo
    {
        return $this->belongsTo(Notification::class, 'notification_id');
    }

    public function notificationTemplate(): BelongsTo
    {
        return $this->belongsTo(NotificationTemplate::class, 'notification_template_id');
    }
}

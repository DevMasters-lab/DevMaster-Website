<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NotificationTemplate extends DomainModel
{
    protected $table = 'notification_templates';

    protected function casts(): array
    {
        return ['version_no' => 'integer', 'variables_schema' => 'array', 'is_active' => 'boolean', 'published_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function deliveryAttemptsByNotificationTemplate(): HasMany
    {
        return $this->hasMany(DeliveryAttempt::class, 'notification_template_id');
    }
}

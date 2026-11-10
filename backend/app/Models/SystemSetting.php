<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemSetting extends DomainModel
{
    protected $table = 'system_settings';

    protected function casts(): array
    {
        return ['value' => 'array', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function updatedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}

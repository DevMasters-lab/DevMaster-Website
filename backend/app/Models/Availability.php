<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Availability extends DomainModel
{
    protected $table = 'availabilities';

    protected function casts(): array
    {
        return ['starts_on' => 'immutable_date:Y-m-d', 'ends_on' => 'immutable_date:Y-m-d', 'hours_per_week' => 'decimal:2', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }
}

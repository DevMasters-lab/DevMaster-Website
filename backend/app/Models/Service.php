<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends DomainModel
{
    protected $table = 'services';

    protected function casts(): array
    {
        return ['translations' => 'array', 'is_active' => 'boolean', 'sort_order' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function requestServicesByService(): HasMany
    {
        return $this->hasMany(RequestService::class, 'service_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestService extends DomainModel
{
    protected $table = 'request_services';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }
}

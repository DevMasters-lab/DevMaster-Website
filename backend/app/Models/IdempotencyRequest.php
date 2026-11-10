<?php

namespace App\Models;

class IdempotencyRequest extends DomainModel
{
    protected $table = 'idempotency_requests';

    protected function casts(): array
    {
        return ['response_status' => 'integer', 'response_summary' => 'array', 'lease_expires_at' => 'immutable_datetime', 'expires_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }
}

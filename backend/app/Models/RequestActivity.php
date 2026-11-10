<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestActivity extends DomainModel
{
    protected $table = 'request_activities';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['occurred_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function actorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}

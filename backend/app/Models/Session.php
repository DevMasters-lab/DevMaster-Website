<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Session extends DomainModel
{
    protected $table = 'sessions';

    protected function casts(): array
    {
        return ['expires_at' => 'immutable_datetime', 'last_used_at' => 'immutable_datetime', 'revoked_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function rotatedFromSession(): BelongsTo
    {
        return $this->belongsTo(Session::class, 'rotated_from_session_id');
    }

    public function sessionsByRotatedFromSession(): HasMany
    {
        return $this->hasMany(Session::class, 'rotated_from_session_id');
    }
}

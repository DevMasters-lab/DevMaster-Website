<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutreachRecord extends DomainModel
{
    protected $table = 'outreach_records';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['contacted_at' => 'immutable_datetime', 'follow_up_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class, 'candidate_id');
    }

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }
}

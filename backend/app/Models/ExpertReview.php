<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpertReview extends DomainModel
{
    protected $table = 'expert_reviews';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['reviewed_profile_snapshot' => 'array', 'reviewed_document_refs' => 'array', 'reviewed_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function reviewerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_user_id');
    }
}

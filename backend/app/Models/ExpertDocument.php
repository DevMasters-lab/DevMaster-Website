<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpertDocument extends DomainModel
{
    protected $table = 'expert_documents';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['is_primary_cv' => 'boolean', 'created_at' => 'immutable_datetime'];
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    public function linkedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'linked_by_user_id');
    }
}

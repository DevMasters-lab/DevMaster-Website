<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestDocument extends DomainModel
{
    protected $table = 'request_documents';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
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

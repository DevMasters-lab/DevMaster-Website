<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Document extends DomainModel
{
    protected $table = 'documents';

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function documentVersionsByDocument(): HasMany
    {
        return $this->hasMany(DocumentVersion::class, 'document_id');
    }

    public function expertDocumentsByDocument(): HasMany
    {
        return $this->hasMany(ExpertDocument::class, 'document_id');
    }

    public function requestDocumentsByDocument(): HasMany
    {
        return $this->hasMany(RequestDocument::class, 'document_id');
    }

    public function versions()
    {
        return $this->hasMany(DocumentVersion::class);
    }
}

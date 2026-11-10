<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DocumentVersion extends DomainModel
{
    protected $table = 'document_versions';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['version_no' => 'integer', 'size_bytes' => 'integer', 'scanned_at' => 'immutable_datetime', 'uploaded_at' => 'immutable_datetime'];
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    public function uploadedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function offerDocumentsByDocumentVersion(): HasMany
    {
        return $this->hasMany(OfferDocument::class, 'document_version_id');
    }

    public function offerResponseEvidenceByDocumentVersion(): HasMany
    {
        return $this->hasMany(OfferResponseEvidence::class, 'document_version_id');
    }

    public function exportJobsByOutputDocumentVersion(): HasMany
    {
        return $this->hasMany(ExportJob::class, 'output_document_version_id');
    }
}

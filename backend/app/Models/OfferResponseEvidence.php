<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfferResponseEvidence extends DomainModel
{
    protected $table = 'offer_response_evidence';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime'];
    }

    public function offerResponse(): BelongsTo
    {
        return $this->belongsTo(OfferResponse::class, 'offer_response_id');
    }

    public function documentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }
}

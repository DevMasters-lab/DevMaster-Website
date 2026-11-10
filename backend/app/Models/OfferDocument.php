<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfferDocument extends DomainModel
{
    protected $table = 'offer_documents';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['sort_order' => 'integer', 'created_at' => 'immutable_datetime'];
    }

    public function offerVersion(): BelongsTo
    {
        return $this->belongsTo(OfferVersion::class, 'offer_version_id');
    }

    public function documentVersion(): BelongsTo
    {
        return $this->belongsTo(DocumentVersion::class, 'document_version_id');
    }
}

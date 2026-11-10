<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfferResponse extends DomainModel
{
    protected $table = 'offer_responses';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['responded_at' => 'immutable_datetime', 'recorded_at' => 'immutable_datetime'];
    }

    public function offerVersion(): BelongsTo
    {
        return $this->belongsTo(OfferVersion::class, 'offer_version_id');
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }

    public function selectionDecisionsByAcceptedResponse(): HasMany
    {
        return $this->hasMany(SelectionDecision::class, 'accepted_response_id');
    }

    public function placementsByAcceptedResponse(): HasMany
    {
        return $this->hasMany(Placement::class, 'accepted_response_id');
    }

    public function offerResponseEvidenceByOfferResponse(): HasMany
    {
        return $this->hasMany(OfferResponseEvidence::class, 'offer_response_id');
    }
}

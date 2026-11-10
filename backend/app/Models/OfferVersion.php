<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfferVersion extends DomainModel
{
    protected $table = 'offer_versions';

    protected function casts(): array
    {
        return ['version_no' => 'integer', 'starts_on' => 'immutable_date:Y-m-d', 'ends_on' => 'immutable_date:Y-m-d', 'compensation_amount' => 'decimal:2', 'expires_at' => 'immutable_datetime', 'issued_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(ExpertOffer::class, 'offer_id');
    }

    public function issuedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_user_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function expertOffersByCurrentVersion(): HasMany
    {
        return $this->hasMany(ExpertOffer::class, 'current_version_id');
    }

    public function offerResponsesByOfferVersion(): HasMany
    {
        return $this->hasMany(OfferResponse::class, 'offer_version_id');
    }

    public function selectionDecisionsByOfferVersion(): HasMany
    {
        return $this->hasMany(SelectionDecision::class, 'offer_version_id');
    }

    public function placementsByOfferVersion(): HasMany
    {
        return $this->hasMany(Placement::class, 'offer_version_id');
    }

    public function offerDocumentsByOfferVersion(): HasMany
    {
        return $this->hasMany(OfferDocument::class, 'offer_version_id');
    }

    public function responses()
    {
        return $this->hasMany(OfferResponse::class, 'offer_version_id');
    }
}

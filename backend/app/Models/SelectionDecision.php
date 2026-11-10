<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SelectionDecision extends DomainModel
{
    protected $table = 'selection_decisions';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['decision_no' => 'integer', 'decided_at' => 'immutable_datetime'];
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(ExpertOffer::class, 'offer_id');
    }

    public function offerVersion(): BelongsTo
    {
        return $this->belongsTo(OfferVersion::class, 'offer_version_id');
    }

    public function acceptedResponse(): BelongsTo
    {
        return $this->belongsTo(OfferResponse::class, 'accepted_response_id');
    }

    public function decidedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }

    public function supersedesDecision(): BelongsTo
    {
        return $this->belongsTo(SelectionDecision::class, 'supersedes_decision_id');
    }

    public function selectionDecisionsBySupersedesDecision(): HasMany
    {
        return $this->hasMany(SelectionDecision::class, 'supersedes_decision_id');
    }

    public function placementsBySelectionDecision(): HasMany
    {
        return $this->hasMany(Placement::class, 'selection_decision_id');
    }
}

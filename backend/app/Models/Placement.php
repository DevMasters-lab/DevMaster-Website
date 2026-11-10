<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Placement extends DomainModel
{
    protected $table = 'placements';

    protected function casts(): array
    {
        return ['starts_on' => 'immutable_date:Y-m-d', 'ends_on' => 'immutable_date:Y-m-d', 'actual_end_on' => 'immutable_date:Y-m-d', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
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

    public function selectionDecision(): BelongsTo
    {
        return $this->belongsTo(SelectionDecision::class, 'selection_decision_id');
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}

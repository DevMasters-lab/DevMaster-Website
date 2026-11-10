<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpertOffer extends DomainModel
{
    protected $table = 'expert_offers';

    protected function casts(): array
    {
        return ['created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class, 'candidate_id');
    }

    public function requestRole(): BelongsTo
    {
        return $this->belongsTo(RequestRole::class, 'request_role_id');
    }

    public function responsibleUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_user_id');
    }

    public function currentVersion(): BelongsTo
    {
        return $this->belongsTo(OfferVersion::class, 'current_version_id');
    }

    public function offerVersionsByOffer(): HasMany
    {
        return $this->hasMany(OfferVersion::class, 'offer_id');
    }

    public function selectionDecisionsByOffer(): HasMany
    {
        return $this->hasMany(SelectionDecision::class, 'offer_id');
    }

    public function placementsByOffer(): HasMany
    {
        return $this->hasMany(Placement::class, 'offer_id');
    }

    public function versions()
    {
        return $this->hasMany(OfferVersion::class, 'offer_id');
    }
}

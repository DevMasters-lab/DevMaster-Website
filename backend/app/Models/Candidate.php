<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Candidate extends DomainModel
{
    protected $table = 'candidates';

    protected function casts(): array
    {
        return ['shortlisted_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function shortlistedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shortlisted_by_user_id');
    }

    public function outreachRecordsByCandidate(): HasMany
    {
        return $this->hasMany(OutreachRecord::class, 'candidate_id');
    }

    public function expertOffersByCandidate(): HasMany
    {
        return $this->hasMany(ExpertOffer::class, 'candidate_id');
    }
}

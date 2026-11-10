<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpertProfile extends DomainModel
{
    protected $table = 'expert_profiles';

    protected function casts(): array
    {
        return ['application_snapshot' => 'array', 'submitted_at' => 'immutable_datetime', 'approved_at' => 'immutable_datetime', 'activated_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function expertReviewsByExpertProfile(): HasMany
    {
        return $this->hasMany(ExpertReview::class, 'expert_profile_id');
    }

    public function expertSkillsByExpertProfile(): HasMany
    {
        return $this->hasMany(ExpertSkill::class, 'expert_profile_id');
    }

    public function availabilitiesByExpertProfile(): HasMany
    {
        return $this->hasMany(Availability::class, 'expert_profile_id');
    }

    public function consentRecordsByExpertProfile(): HasMany
    {
        return $this->hasMany(ConsentRecord::class, 'expert_profile_id');
    }

    public function candidatesByExpertProfile(): HasMany
    {
        return $this->hasMany(Candidate::class, 'expert_profile_id');
    }

    public function expertOffersByExpertProfile(): HasMany
    {
        return $this->hasMany(ExpertOffer::class, 'expert_profile_id');
    }

    public function placementsByExpertProfile(): HasMany
    {
        return $this->hasMany(Placement::class, 'expert_profile_id');
    }

    public function expertDocumentsByExpertProfile(): HasMany
    {
        return $this->hasMany(ExpertDocument::class, 'expert_profile_id');
    }

    public function skills()
    {
        return $this->belongsToMany(Skill::class, 'expert_skills', 'expert_profile_id', 'skill_id')->withPivot('proficiency', 'years_experience');
    }

    public function availabilities()
    {
        return $this->hasMany(Availability::class);
    }
}

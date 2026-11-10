<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpertSkill extends DomainModel
{
    protected $table = 'expert_skills';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['years_experience' => 'decimal:1', 'created_at' => 'immutable_datetime'];
    }

    public function expertProfile(): BelongsTo
    {
        return $this->belongsTo(ExpertProfile::class, 'expert_profile_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class, 'skill_id');
    }
}

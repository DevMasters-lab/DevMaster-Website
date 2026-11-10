<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

class Skill extends DomainModel
{
    protected $table = 'skills';

    protected function casts(): array
    {
        return ['translations' => 'array', 'is_active' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function expertSkillsBySkill(): HasMany
    {
        return $this->hasMany(ExpertSkill::class, 'skill_id');
    }

    public function requestRoleSkillsBySkill(): HasMany
    {
        return $this->hasMany(RequestRoleSkill::class, 'skill_id');
    }
}

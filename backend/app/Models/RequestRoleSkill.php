<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestRoleSkill extends DomainModel
{
    protected $table = 'request_role_skills';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['is_required' => 'boolean', 'created_at' => 'immutable_datetime'];
    }

    public function requestRole(): BelongsTo
    {
        return $this->belongsTo(RequestRole::class, 'request_role_id');
    }

    public function skill(): BelongsTo
    {
        return $this->belongsTo(Skill::class, 'skill_id');
    }
}

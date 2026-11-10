<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RequestRole extends DomainModel
{
    protected $table = 'request_roles';

    protected function casts(): array
    {
        return ['headcount' => 'integer', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(CompanyRequest::class, 'request_id');
    }

    public function expertOffersByRequestRole(): HasMany
    {
        return $this->hasMany(ExpertOffer::class, 'request_role_id');
    }

    public function requestRoleSkillsByRequestRole(): HasMany
    {
        return $this->hasMany(RequestRoleSkill::class, 'request_role_id');
    }
}

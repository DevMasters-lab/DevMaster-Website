<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends DomainModel
{
    protected $table = 'organizations';

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function contactsByOrganization(): HasMany
    {
        return $this->hasMany(Contact::class, 'organization_id');
    }

    public function companyRequestsByOrganization(): HasMany
    {
        return $this->hasMany(CompanyRequest::class, 'organization_id');
    }
}

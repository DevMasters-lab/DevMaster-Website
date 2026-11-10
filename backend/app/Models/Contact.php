<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends DomainModel
{
    protected $table = 'contacts';

    protected function casts(): array
    {
        return ['is_primary' => 'boolean', 'is_active' => 'boolean', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function companyRequestsByContact(): HasMany
    {
        return $this->hasMany(CompanyRequest::class, 'contact_id');
    }
}

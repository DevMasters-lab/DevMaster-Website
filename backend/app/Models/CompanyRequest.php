<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyRequest extends DomainModel
{
    protected $table = 'company_requests';

    protected function casts(): array
    {
        return ['submission_snapshot' => 'array', 'expected_start_on' => 'immutable_date:Y-m-d', 'expected_end_on' => 'immutable_date:Y-m-d', 'response_due_at' => 'immutable_datetime', 'submitted_at' => 'immutable_datetime', 'closed_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime', 'record_version' => 'integer'];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'organization_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function ownerUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function requestRolesByRequest(): HasMany
    {
        return $this->hasMany(RequestRole::class, 'request_id');
    }

    public function requestActivitiesByRequest(): HasMany
    {
        return $this->hasMany(RequestActivity::class, 'request_id');
    }

    public function candidatesByRequest(): HasMany
    {
        return $this->hasMany(Candidate::class, 'request_id');
    }

    public function expertOffersByRequest(): HasMany
    {
        return $this->hasMany(ExpertOffer::class, 'request_id');
    }

    public function placementsByRequest(): HasMany
    {
        return $this->hasMany(Placement::class, 'request_id');
    }

    public function requestDocumentsByRequest(): HasMany
    {
        return $this->hasMany(RequestDocument::class, 'request_id');
    }

    public function requestServicesByRequest(): HasMany
    {
        return $this->hasMany(RequestService::class, 'request_id');
    }
}

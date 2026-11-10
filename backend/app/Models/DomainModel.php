<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

abstract class DomainModel extends Model
{
    use HasFactory, HasUuids;

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    public function uniqueIds(): array
    {
        return in_array($this->getTable(), ['user_roles', 'role_permissions', 'expert_skills', 'expert_documents', 'request_documents', 'offer_documents', 'request_role_skills', 'request_services', 'offer_response_evidence']) ? [] : ['id'];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (array_key_exists('record_version', $model->getAttributes())) {
                $model->record_version = 1;
            }
        });
    }
}

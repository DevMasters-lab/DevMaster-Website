<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RolePermission extends DomainModel
{
    protected $table = 'role_permissions';

    public $timestamps = false;

    protected function casts(): array
    {
        return ['granted_at' => 'immutable_datetime'];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function permission(): BelongsTo
    {
        return $this->belongsTo(Permission::class, 'permission_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Permission extends \Spatie\Permission\Models\Permission
{
    use HasUuids;

    public $timestamps = false;

    protected $guarded = [];
}

<?php

namespace App\Policies;

class PermissionPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('permissions');
    }
}

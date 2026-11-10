<?php

namespace App\Policies;

class RolePermissionPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('role_permissions');
    }
}

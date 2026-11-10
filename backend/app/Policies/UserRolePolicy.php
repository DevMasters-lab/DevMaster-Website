<?php

namespace App\Policies;

class UserRolePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('user_roles');
    }
}

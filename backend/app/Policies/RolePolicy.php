<?php

namespace App\Policies;

class RolePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('roles');
    }
}

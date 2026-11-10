<?php

namespace App\Policies;

class RequestRolePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('request_roles');
    }
}

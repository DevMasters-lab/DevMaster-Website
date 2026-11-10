<?php

namespace App\Policies;

class UserPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('users');
    }
}

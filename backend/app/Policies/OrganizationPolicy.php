<?php

namespace App\Policies;

class OrganizationPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('organizations');
    }
}

<?php

namespace App\Policies;

class CompanyRequestPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('company_requests');
    }
}

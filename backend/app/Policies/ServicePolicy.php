<?php

namespace App\Policies;

class ServicePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('services');
    }
}

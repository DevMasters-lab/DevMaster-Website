<?php

namespace App\Policies;

class AvailabilityPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('availabilities');
    }
}

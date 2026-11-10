<?php

namespace App\Policies;

class ExpertProfilePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('expert_profiles');
    }
}

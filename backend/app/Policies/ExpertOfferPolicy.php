<?php

namespace App\Policies;

class ExpertOfferPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('expert_offers');
    }
}

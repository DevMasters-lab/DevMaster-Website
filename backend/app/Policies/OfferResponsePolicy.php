<?php

namespace App\Policies;

class OfferResponsePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('offer_responses');
    }
}

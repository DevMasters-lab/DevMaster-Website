<?php

namespace App\Policies;

class OfferVersionPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('offer_versions');
    }
}

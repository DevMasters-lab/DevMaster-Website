<?php

namespace App\Policies;

class OfferResponseEvidencePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('offer_response_evidence');
    }
}

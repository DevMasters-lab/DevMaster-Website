<?php

namespace App\Policies;

class OfferDocumentPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('offer_documents');
    }
}

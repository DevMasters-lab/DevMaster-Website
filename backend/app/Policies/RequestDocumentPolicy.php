<?php

namespace App\Policies;

class RequestDocumentPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('request_documents');
    }
}

<?php

namespace App\Policies;

class ExpertDocumentPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('expert_documents');
    }
}

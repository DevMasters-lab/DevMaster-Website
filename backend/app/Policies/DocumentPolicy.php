<?php

namespace App\Policies;

class DocumentPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('documents');
    }
}

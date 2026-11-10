<?php

namespace App\Policies;

class SelectionDecisionPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('selection_decisions');
    }
}

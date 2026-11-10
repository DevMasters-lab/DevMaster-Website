<?php

namespace App\Policies;

class CandidatePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('candidates');
    }
}

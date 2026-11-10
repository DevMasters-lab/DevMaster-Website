<?php

namespace App\Policies;

class ExpertReviewPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('expert_reviews');
    }
}

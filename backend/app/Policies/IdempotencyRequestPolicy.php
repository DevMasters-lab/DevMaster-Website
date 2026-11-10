<?php

namespace App\Policies;

class IdempotencyRequestPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('idempotency_requests');
    }
}

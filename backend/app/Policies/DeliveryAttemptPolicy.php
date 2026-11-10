<?php

namespace App\Policies;

class DeliveryAttemptPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('delivery_attempts');
    }
}

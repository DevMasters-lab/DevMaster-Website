<?php

namespace App\Policies;

class OutboxEventPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('outbox_events');
    }
}

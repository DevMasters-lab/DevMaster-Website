<?php

namespace App\Policies;

class AuditEventPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('audit_events');
    }
}

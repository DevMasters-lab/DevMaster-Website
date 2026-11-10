<?php

namespace App\Policies;

class OutreachRecordPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('outreach_records');
    }
}

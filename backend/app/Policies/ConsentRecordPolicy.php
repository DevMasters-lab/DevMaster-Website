<?php

namespace App\Policies;

class ConsentRecordPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('consent_records');
    }
}

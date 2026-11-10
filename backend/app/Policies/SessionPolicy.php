<?php

namespace App\Policies;

class SessionPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('sessions');
    }
}

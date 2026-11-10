<?php

namespace App\Policies;

class RequestActivityPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('request_activities');
    }
}

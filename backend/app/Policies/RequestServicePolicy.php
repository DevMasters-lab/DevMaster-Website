<?php

namespace App\Policies;

class RequestServicePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('request_services');
    }
}

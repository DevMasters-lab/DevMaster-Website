<?php

namespace App\Policies;

class ContactPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('contacts');
    }
}

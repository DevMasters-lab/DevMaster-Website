<?php

namespace App\Policies;

class NotificationPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('notifications');
    }
}

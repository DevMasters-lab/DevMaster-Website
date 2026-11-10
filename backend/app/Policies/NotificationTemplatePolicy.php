<?php

namespace App\Policies;

class NotificationTemplatePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('notification_templates');
    }
}

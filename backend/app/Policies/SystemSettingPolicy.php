<?php

namespace App\Policies;

class SystemSettingPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('system_settings');
    }
}

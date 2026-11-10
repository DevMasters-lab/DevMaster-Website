<?php

namespace App\Policies;

class RequestRoleSkillPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('request_role_skills');
    }
}

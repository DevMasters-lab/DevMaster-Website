<?php

namespace App\Policies;

class SkillPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('skills');
    }
}

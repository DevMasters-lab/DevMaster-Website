<?php

namespace App\Policies;

class ExpertSkillPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('expert_skills');
    }
}

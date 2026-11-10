<?php

namespace App\Policies;

class PlacementPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('placements');
    }
}

<?php

namespace App\Policies;

class PublicPagePolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('public_pages');
    }
}

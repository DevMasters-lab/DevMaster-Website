<?php

namespace App\Policies;

class ExportJobPolicy extends DomainPolicy
{
    public function __construct()
    {
        parent::__construct('export_jobs');
    }
}

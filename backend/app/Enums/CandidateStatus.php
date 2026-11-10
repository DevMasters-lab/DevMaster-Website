<?php

namespace App\Enums;

enum CandidateStatus: string
{
    case SHORTLISTED = 'SHORTLISTED';
    case CONTACTED = 'CONTACTED';
    case INTERESTED = 'INTERESTED';
    case NOT_INTERESTED = 'NOT_INTERESTED';
    case REMOVED = 'REMOVED';
}

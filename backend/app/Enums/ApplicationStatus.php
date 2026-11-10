<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case SUBMITTED = 'SUBMITTED';
    case UNDER_REVIEW = 'UNDER_REVIEW';
    case CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED';
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case WITHDRAWN = 'WITHDRAWN';
}

<?php

namespace App\Enums;

enum RequestStatus: string
{
    case SUBMITTED = 'SUBMITTED';
    case UNDER_REVIEW = 'UNDER_REVIEW';
    case CLARIFICATION_REQUIRED = 'CLARIFICATION_REQUIRED';
    case MATCHING = 'MATCHING';
    case ON_HOLD = 'ON_HOLD';
    case CLOSED = 'CLOSED';
    case CANCELLED = 'CANCELLED';
}

<?php

namespace App\Enums;

enum ExpertReviewDecision: string
{
    case APPROVED = 'APPROVED';
    case REJECTED = 'REJECTED';
    case CORRECTIONS_REQUIRED = 'CORRECTIONS_REQUIRED';
}

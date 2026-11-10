<?php

namespace App\Enums;

enum RateBasis: string
{
    case HOUR = 'HOUR';
    case DAY = 'DAY';
    case MONTH = 'MONTH';
    case FIXED = 'FIXED';
    case OTHER = 'OTHER';
}

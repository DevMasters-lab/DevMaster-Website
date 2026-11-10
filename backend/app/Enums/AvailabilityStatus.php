<?php

namespace App\Enums;

enum AvailabilityStatus: string
{
    case AVAILABLE = 'AVAILABLE';
    case LIMITED = 'LIMITED';
    case UNAVAILABLE = 'UNAVAILABLE';
}

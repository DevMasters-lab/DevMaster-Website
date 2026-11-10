<?php

namespace App\Enums;

enum PlacementStatus: string
{
    case CONFIRMED = 'CONFIRMED';
    case ACTIVE = 'ACTIVE';
    case ENDED = 'ENDED';
    case CANCELLED = 'CANCELLED';
}

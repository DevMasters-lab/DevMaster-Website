<?php

namespace App\Enums;

enum NetworkStatus: string
{
    case PENDING = 'PENDING';
    case ACTIVE = 'ACTIVE';
    case SUSPENDED = 'SUSPENDED';
    case ARCHIVED = 'ARCHIVED';
}

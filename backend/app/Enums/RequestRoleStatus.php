<?php

namespace App\Enums;

enum RequestRoleStatus: string
{
    case OPEN = 'OPEN';
    case FILLED = 'FILLED';
    case CANCELLED = 'CANCELLED';
}

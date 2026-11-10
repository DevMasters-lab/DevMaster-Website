<?php

namespace App\Enums;

enum WorkMode: string
{
    case REMOTE = 'REMOTE';
    case ONSITE = 'ONSITE';
    case HYBRID = 'HYBRID';
}

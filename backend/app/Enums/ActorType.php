<?php

namespace App\Enums;

enum ActorType: string
{
    case USER = 'USER';
    case PUBLIC = 'PUBLIC';
    case SYSTEM = 'SYSTEM';
}

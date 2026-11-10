<?php

namespace App\Enums;

enum ResponseChannel: string
{
    case PORTAL = 'PORTAL';
    case EMAIL = 'EMAIL';
    case PHONE = 'PHONE';
    case IN_PERSON = 'IN_PERSON';
}

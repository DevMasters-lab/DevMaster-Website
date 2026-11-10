<?php

namespace App\Enums;

enum OutreachChannel: string
{
    case EMAIL = 'EMAIL';
    case PHONE = 'PHONE';
    case PORTAL = 'PORTAL';
    case IN_PERSON = 'IN_PERSON';
}

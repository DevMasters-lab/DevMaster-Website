<?php

namespace App\Enums;

enum ConsentChannel: string
{
    case PUBLIC_FORM = 'PUBLIC_FORM';
    case PORTAL = 'PORTAL';
    case STAFF_RECORDED = 'STAFF_RECORDED';
}

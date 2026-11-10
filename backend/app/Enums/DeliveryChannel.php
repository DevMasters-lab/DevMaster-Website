<?php

namespace App\Enums;

enum DeliveryChannel: string
{
    case EMAIL = 'EMAIL';
    case SMS = 'SMS';
}

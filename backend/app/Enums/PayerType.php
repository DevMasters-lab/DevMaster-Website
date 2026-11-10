<?php

namespace App\Enums;

enum PayerType: string
{
    case DEVMASTERS = 'DEVMASTERS';
    case REQUESTING_COMPANY = 'REQUESTING_COMPANY';
    case OTHER = 'OTHER';
}

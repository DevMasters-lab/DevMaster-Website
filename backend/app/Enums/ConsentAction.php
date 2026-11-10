<?php

namespace App\Enums;

enum ConsentAction: string
{
    case GRANTED = 'GRANTED';
    case WITHDRAWN = 'WITHDRAWN';
}

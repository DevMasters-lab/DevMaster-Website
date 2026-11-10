<?php

namespace App\Enums;

enum OutboxStatus: string
{
    case PENDING = 'PENDING';
    case PUBLISHING = 'PUBLISHING';
    case PUBLISHED = 'PUBLISHED';
    case FAILED = 'FAILED';
}

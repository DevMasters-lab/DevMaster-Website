<?php

namespace App\Enums;

enum ExportType: string
{
    case REQUESTS = 'REQUESTS';
    case OFFERS = 'OFFERS';
    case PLACEMENTS = 'PLACEMENTS';
}

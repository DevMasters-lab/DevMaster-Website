<?php

namespace App\Enums;

enum OfferResponseType: string
{
    case ACCEPTED = 'ACCEPTED';
    case DECLINED = 'DECLINED';
    case CHANGES_REQUESTED = 'CHANGES_REQUESTED';
    case COMMENT = 'COMMENT';
}

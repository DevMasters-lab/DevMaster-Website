<?php

namespace App\Enums;

enum OfferStatus: string
{
    case DRAFT = 'DRAFT';
    case ISSUED = 'ISSUED';
    case ACCEPTED = 'ACCEPTED';
    case DECLINED = 'DECLINED';
    case CHANGES_REQUESTED = 'CHANGES_REQUESTED';
    case EXPIRED = 'EXPIRED';
    case WITHDRAWN = 'WITHDRAWN';
    case SUPERSEDED = 'SUPERSEDED';
}

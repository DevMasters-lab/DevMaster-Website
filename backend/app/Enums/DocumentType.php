<?php

namespace App\Enums;

enum DocumentType: string
{
    case CV = 'CV';
    case CERTIFICATE = 'CERTIFICATE';
    case REQUEST_FILE = 'REQUEST_FILE';
    case OFFER_ATTACHMENT = 'OFFER_ATTACHMENT';
    case RESPONSE_EVIDENCE = 'RESPONSE_EVIDENCE';
    case EXPORT = 'EXPORT';
    case OTHER = 'OTHER';
}

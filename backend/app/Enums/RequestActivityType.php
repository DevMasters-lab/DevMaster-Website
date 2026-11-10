<?php

namespace App\Enums;

enum RequestActivityType: string
{
    case SUBMITTED = 'SUBMITTED';
    case NOTE = 'NOTE';
    case CLARIFICATION = 'CLARIFICATION';
    case STATUS_CHANGED = 'STATUS_CHANGED';
    case OWNER_ASSIGNED = 'OWNER_ASSIGNED';
    case CRM_LINKED = 'CRM_LINKED';
}

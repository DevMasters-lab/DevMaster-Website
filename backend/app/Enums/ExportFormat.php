<?php

namespace App\Enums;

enum ExportFormat: string
{
    case CSV = 'CSV';
    case XLSX = 'XLSX';
}

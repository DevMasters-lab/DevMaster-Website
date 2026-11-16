<?php

namespace App\Filament\Widgets;

use App\Models\CompanyRequest;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PlatformStats extends StatsOverviewWidget
{
    public static function canView(): bool
    {
        return auth()->user()?->can('requests.manage') ?? false;
    }

    protected function getStats(): array
    {
        $stats = [];
        if (auth()->user()?->can('requests.manage')) {
            $stats[] = Stat::make(__('Requests to review'), CompanyRequest::whereIn('status', ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'])->count())->description(__('Public company submissions'))->color('primary');
        }

        return $stats;
    }
}

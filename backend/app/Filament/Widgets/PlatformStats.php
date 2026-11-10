<?php

namespace App\Filament\Widgets;

use App\Models\CompanyRequest;
use App\Models\ExpertOffer;
use App\Models\ExpertProfile;
use App\Models\Placement;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PlatformStats extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [Stat::make(__('Requests to review'), CompanyRequest::whereIn('status', ['SUBMITTED', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED'])->count())->description(__('Public company submissions'))->color('primary'), Stat::make(__('Expert applications'), ExpertProfile::whereIn('application_status', ['SUBMITTED', 'UNDER_REVIEW'])->count())->description(__('Awaiting a review decision')), Stat::make(__('Open offers'), ExpertOffer::where('status', 'ISSUED')->count())->description(__('Acceptance is separate from selection')), Stat::make(__('Current placements'), Placement::whereIn('status', ['CONFIRMED', 'ACTIVE'])->count())->description(__('Confirmed by DevMasters'))];
    }
}

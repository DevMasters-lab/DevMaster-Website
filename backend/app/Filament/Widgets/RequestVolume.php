<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class RequestVolume extends ChartWidget
{
    public function getHeading(): string
    {
        return __('Company requests · last 14 days');
    }

    public static function canView(): bool
    {
        return auth()->user()?->can('requests.manage') ?? false;
    }

    protected function getData(): array
    {
        $counts = DB::table('company_requests')->where('submitted_at', '>=', now()->subDays(13)->startOfDay())->selectRaw('submitted_at::date AS day, count(*) AS count')->groupByRaw('submitted_at::date')->pluck('count', 'day');
        $labels = [];
        $values = [];
        for ($i = 13; $i >= 0; $i--) {
            $d = today()->subDays($i);
            $labels[] = $d->locale(app()->getLocale())->translatedFormat('d M');
            $values[] = (int) ($counts[$d->toDateString()] ?? 0);
        }

        return ['datasets' => [['label' => __('Requests'), 'data' => $values, 'borderColor' => '#7951d4', 'backgroundColor' => '#a78bfa40', 'fill' => true, 'tension' => .3]], 'labels' => $labels];
    }

    protected function getOptions(): array
    {
        return [
            'font' => ['size' => 14],
            'scales' => [
                'x' => ['ticks' => ['font' => ['size' => 14]]],
                'y' => ['ticks' => ['font' => ['size' => 14]]],
            ],
            'plugins' => [
                'legend' => ['labels' => ['font' => ['size' => 14]]],
                'tooltip' => ['titleFont' => ['size' => 14], 'bodyFont' => ['size' => 14]],
            ],
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}

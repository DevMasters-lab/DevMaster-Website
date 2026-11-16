<?php

namespace App\Filament\RelationManagers;

use App\Support\Localization;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class RequestTimeline extends RelationManager
{
    protected static string $relationship = 'requestActivitiesByRequest';

    public static function getTitle(Model $ownerRecord, string $pageClass): string
    {
        return Localization::label('request_activities');
    }

    public function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('activity_type')->label(__('Activity type'))->formatStateUsing(fn (string $state): string => Localization::status($state)),
            TextColumn::make('actor_type')->label(__('Actor type'))->formatStateUsing(fn (string $state): string => Localization::status($state)),
            TextColumn::make('body')->label(__('Body'))->wrap(),
            TextColumn::make('from_status')->label(__('From status'))->formatStateUsing(fn (?string $state): string => $state ? Localization::status($state) : '—'),
            TextColumn::make('to_status')->label(__('To status'))->formatStateUsing(fn (?string $state): string => $state ? Localization::status($state) : '—'),
            TextColumn::make('occurred_at')->label(__('Occurred at'))->dateTime('d M Y H:i')->sortable(),
        ])->defaultSort('occurred_at', 'desc')->paginated([10, 25, 50, 100])->defaultPaginationPageOption(10)->recordActions([])->headerActions([]);
    }
}

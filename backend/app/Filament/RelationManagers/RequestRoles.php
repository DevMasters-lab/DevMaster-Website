<?php

namespace App\Filament\RelationManagers;

use App\Support\Localization;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

class RequestRoles extends RelationManager
{
    protected static string $relationship = 'requestRolesByRequest';

    public static function getTitle(Model $ownerRecord, string $pageClass): string
    {
        return Localization::label('request_roles');
    }

    public function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('role_title')->label(__('Role title'))->searchable()->sortable(),
            TextColumn::make('headcount')->label(__('Headcount'))->sortable(),
            TextColumn::make('scope')->label(__('Scope'))->wrap(),
            TextColumn::make('status')->label(__('Status'))->formatStateUsing(fn (string $state): string => Localization::status($state))->badge(),
            TextColumn::make('created_at')->label(__('Created at'))->dateTime('d M Y H:i')->sortable(),
        ])->defaultSort('created_at', 'desc')->recordActions([])->headerActions([]);
    }
}

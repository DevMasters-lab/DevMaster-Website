<?php

namespace App\Filament\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

abstract class RelatedRecords extends RelationManager
{
    protected static string $resourceClass;

    public static function getTitle(Model $ownerRecord, string $pageClass): string
    {
        return static::$resourceClass::getPluralModelLabel();
    }

    public function table(Table $table): Table
    {
        return static::$resourceClass::table($table)->recordActions([])->headerActions([]);
    }
}

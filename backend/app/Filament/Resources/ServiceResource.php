<?php

namespace App\Filament\Resources;

use App\Models\Service;

class ServiceResource extends DomainResource
{
    protected static ?string $model = Service::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Content and settings';

    protected static ?string $navigationLabel = 'Services';

    public static function getPages(): array
    {
        return ['index' => ServiceResource\ManageRecords::route('/')];
    }
}

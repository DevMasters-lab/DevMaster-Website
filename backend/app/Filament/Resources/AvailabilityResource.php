<?php

namespace App\Filament\Resources;

use App\Models\Availability;

class AvailabilityResource extends DomainResource
{
    protected static ?string $model = Availability::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Expert network';

    protected static ?string $navigationLabel = 'Availability';

    public static function getPages(): array
    {
        return ['index' => AvailabilityResource\ManageRecords::route('/')];
    }
}

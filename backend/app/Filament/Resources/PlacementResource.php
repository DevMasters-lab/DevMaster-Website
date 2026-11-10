<?php

namespace App\Filament\Resources;

use App\Models\Placement;

class PlacementResource extends DomainResource
{
    protected static ?string $model = Placement::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Offers and placements';

    protected static ?string $navigationLabel = 'Placements';

    public static function getPages(): array
    {
        return ['index' => PlacementResource\ManageRecords::route('/')];
    }
}

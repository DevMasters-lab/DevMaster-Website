<?php

namespace App\Filament\Resources;

use App\Models\OfferVersion;

class OfferVersionResource extends DomainResource
{
    protected static ?string $model = OfferVersion::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Offers and placements';

    protected static ?string $navigationLabel = 'Offer versions';

    public static function getPages(): array
    {
        return ['index' => OfferVersionResource\ManageRecords::route('/')];
    }
}

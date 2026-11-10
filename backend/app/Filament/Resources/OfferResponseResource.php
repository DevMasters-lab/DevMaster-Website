<?php

namespace App\Filament\Resources;

use App\Models\OfferResponse;

class OfferResponseResource extends DomainResource
{
    protected static ?string $model = OfferResponse::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Offers and placements';

    protected static ?string $navigationLabel = 'Offer responses';

    public static function getPages(): array
    {
        return ['index' => OfferResponseResource\ManageRecords::route('/')];
    }
}

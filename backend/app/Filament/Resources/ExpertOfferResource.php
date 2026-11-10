<?php

namespace App\Filament\Resources;

use App\Filament\RelationManagers\OfferPlacements;
use App\Filament\RelationManagers\OfferSelections;
use App\Filament\RelationManagers\OfferVersions;
use App\Models\ExpertOffer;

class ExpertOfferResource extends DomainResource
{
    protected static ?string $model = ExpertOffer::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Offers and placements';

    protected static ?string $navigationLabel = 'Expert offers';

    public static function getPages(): array
    {
        return ['index' => ExpertOfferResource\ManageRecords::route('/'), 'view' => ExpertOfferResource\ViewRecord::route('/{record}')];
    }

    public static function getRelations(): array
    {
        return [OfferVersions::class, OfferSelections::class, OfferPlacements::class];
    }
}

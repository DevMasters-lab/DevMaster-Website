<?php

namespace App\Filament\Resources;

use App\Filament\RelationManagers\ExpertAvailability;
use App\Filament\RelationManagers\ExpertOffers;
use App\Filament\RelationManagers\ExpertReviews;
use App\Models\ExpertProfile;

class ExpertProfileResource extends DomainResource
{
    protected static ?string $model = ExpertProfile::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Expert network';

    protected static ?string $navigationLabel = 'Expert applications and directory';

    public static function getPages(): array
    {
        return ['index' => ExpertProfileResource\ManageRecords::route('/'), 'view' => ExpertProfileResource\ViewRecord::route('/{record}')];
    }

    public static function getRelations(): array
    {
        return [ExpertReviews::class, ExpertOffers::class, ExpertAvailability::class];
    }
}

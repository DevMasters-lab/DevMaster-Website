<?php

namespace App\Filament\Resources;

use App\Models\SelectionDecision;

class SelectionDecisionResource extends DomainResource
{
    protected static ?string $model = SelectionDecision::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Offers and placements';

    protected static ?string $navigationLabel = 'Selection decisions';

    public static function getPages(): array
    {
        return ['index' => SelectionDecisionResource\ManageRecords::route('/')];
    }
}

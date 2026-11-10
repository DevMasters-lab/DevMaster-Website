<?php

namespace App\Filament\Resources;

use App\Models\ExpertReview;

class ExpertReviewResource extends DomainResource
{
    protected static ?string $model = ExpertReview::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Expert network';

    protected static ?string $navigationLabel = 'Application reviews';

    public static function getPages(): array
    {
        return ['index' => ExpertReviewResource\ManageRecords::route('/')];
    }
}

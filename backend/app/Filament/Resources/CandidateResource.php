<?php

namespace App\Filament\Resources;

use App\Models\Candidate;

class CandidateResource extends DomainResource
{
    protected static ?string $model = Candidate::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Matching';

    protected static ?string $navigationLabel = 'Candidate shortlist';

    public static function getPages(): array
    {
        return ['index' => CandidateResource\ManageRecords::route('/')];
    }
}

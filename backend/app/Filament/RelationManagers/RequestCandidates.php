<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\CandidateResource;

class RequestCandidates extends RelatedRecords
{
    protected static string $relationship = 'candidatesByRequest';

    protected static string $resourceClass = CandidateResource::class;
}

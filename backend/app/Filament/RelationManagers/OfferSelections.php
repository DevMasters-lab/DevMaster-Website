<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\SelectionDecisionResource;

class OfferSelections extends RelatedRecords
{
    protected static string $relationship = 'selectionDecisionsByOffer';

    protected static string $resourceClass = SelectionDecisionResource::class;
}

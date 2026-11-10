<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\PlacementResource;

class OfferPlacements extends RelatedRecords
{
    protected static string $relationship = 'placementsByOffer';

    protected static string $resourceClass = PlacementResource::class;
}

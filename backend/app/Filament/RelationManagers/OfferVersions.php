<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\OfferVersionResource;

class OfferVersions extends RelatedRecords
{
    protected static string $relationship = 'offerVersionsByOffer';

    protected static string $resourceClass = OfferVersionResource::class;
}

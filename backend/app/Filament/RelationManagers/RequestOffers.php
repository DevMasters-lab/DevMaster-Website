<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\ExpertOfferResource;

class RequestOffers extends RelatedRecords
{
    protected static string $relationship = 'expertOffersByRequest';

    protected static string $resourceClass = ExpertOfferResource::class;
}

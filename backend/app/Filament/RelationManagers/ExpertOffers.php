<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\ExpertOfferResource;

class ExpertOffers extends RelatedRecords
{
    protected static string $relationship = 'expertOffersByExpertProfile';

    protected static string $resourceClass = ExpertOfferResource::class;
}

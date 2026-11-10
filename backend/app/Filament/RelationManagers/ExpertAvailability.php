<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\AvailabilityResource;

class ExpertAvailability extends RelatedRecords
{
    protected static string $relationship = 'availabilitiesByExpertProfile';

    protected static string $resourceClass = AvailabilityResource::class;
}

<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\RequestActivityResource;

class RequestTimeline extends RelatedRecords
{
    protected static string $relationship = 'requestActivitiesByRequest';

    protected static string $resourceClass = RequestActivityResource::class;
}

<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\ExpertReviewResource;

class ExpertReviews extends RelatedRecords
{
    protected static string $relationship = 'expertReviewsByExpertProfile';

    protected static string $resourceClass = ExpertReviewResource::class;
}

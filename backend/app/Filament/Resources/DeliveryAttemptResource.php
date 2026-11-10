<?php

namespace App\Filament\Resources;

use App\Models\DeliveryAttempt;

class DeliveryAttemptResource extends DomainResource
{
    protected static ?string $model = DeliveryAttempt::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Communications';

    protected static ?string $navigationLabel = 'Delivery attempts';

    public static function getPages(): array
    {
        return ['index' => DeliveryAttemptResource\ManageRecords::route('/')];
    }
}

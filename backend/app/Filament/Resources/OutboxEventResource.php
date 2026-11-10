<?php

namespace App\Filament\Resources;

use App\Models\OutboxEvent;

class OutboxEventResource extends DomainResource
{
    protected static ?string $model = OutboxEvent::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Communications';

    protected static ?string $navigationLabel = 'Outbox events';

    public static function getPages(): array
    {
        return ['index' => OutboxEventResource\ManageRecords::route('/')];
    }
}

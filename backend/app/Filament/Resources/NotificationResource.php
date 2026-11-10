<?php

namespace App\Filament\Resources;

use App\Models\Notification;

class NotificationResource extends DomainResource
{
    protected static ?string $model = Notification::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Communications';

    protected static ?string $navigationLabel = 'Notifications';

    public static function getPages(): array
    {
        return ['index' => NotificationResource\ManageRecords::route('/')];
    }
}

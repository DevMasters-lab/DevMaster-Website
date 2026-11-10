<?php

namespace App\Filament\Resources;

use App\Models\NotificationTemplate;

class NotificationTemplateResource extends DomainResource
{
    protected static ?string $model = NotificationTemplate::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Communications';

    protected static ?string $navigationLabel = 'Notification templates';

    public static function getPages(): array
    {
        return ['index' => NotificationTemplateResource\ManageRecords::route('/')];
    }
}

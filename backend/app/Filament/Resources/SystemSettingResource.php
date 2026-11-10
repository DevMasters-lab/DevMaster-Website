<?php

namespace App\Filament\Resources;

use App\Models\SystemSetting;

class SystemSettingResource extends DomainResource
{
    protected static ?string $model = SystemSetting::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Content and settings';

    protected static ?string $navigationLabel = 'System settings';

    public static function getPages(): array
    {
        return ['index' => SystemSettingResource\ManageRecords::route('/')];
    }
}

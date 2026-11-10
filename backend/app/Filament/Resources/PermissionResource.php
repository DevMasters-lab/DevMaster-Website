<?php

namespace App\Filament\Resources;

use App\Models\Permission;

class PermissionResource extends DomainResource
{
    protected static ?string $model = Permission::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Identity';

    protected static ?string $navigationLabel = 'Permissions';

    public static function getPages(): array
    {
        return ['index' => PermissionResource\ManageRecords::route('/')];
    }
}

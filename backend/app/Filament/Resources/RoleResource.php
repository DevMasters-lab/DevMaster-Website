<?php

namespace App\Filament\Resources;

use App\Models\Role;

class RoleResource extends DomainResource
{
    protected static ?string $model = Role::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Identity';

    protected static ?string $navigationLabel = 'Roles';

    public static function getPages(): array
    {
        return ['index' => RoleResource\ManageRecords::route('/')];
    }
}

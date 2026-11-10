<?php

namespace App\Filament\Resources;

use App\Models\RequestRole;

class RequestRoleResource extends DomainResource
{
    protected static ?string $model = RequestRole::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Company intake';

    protected static ?string $navigationLabel = 'Requested roles';

    public static function getPages(): array
    {
        return ['index' => RequestRoleResource\ManageRecords::route('/')];
    }
}

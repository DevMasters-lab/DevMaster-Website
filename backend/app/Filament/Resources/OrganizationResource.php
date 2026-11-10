<?php

namespace App\Filament\Resources;

use App\Models\Organization;

class OrganizationResource extends DomainResource
{
    protected static ?string $model = Organization::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Company intake';

    protected static ?string $navigationLabel = 'Organizations';

    public static function getPages(): array
    {
        return ['index' => OrganizationResource\ManageRecords::route('/')];
    }
}

<?php

namespace App\Filament\Resources;

use App\Models\User;

class UserResource extends DomainResource
{
    protected static ?string $model = User::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Identity';

    protected static ?string $navigationLabel = 'Users';

    public static function getPages(): array
    {
        return ['index' => UserResource\ManageRecords::route('/')];
    }
}

<?php

namespace App\Filament\Resources;

use App\Models\RequestActivity;

class RequestActivityResource extends DomainResource
{
    protected static ?string $model = RequestActivity::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Company intake';

    protected static ?string $navigationLabel = 'Request activity';

    public static function getPages(): array
    {
        return ['index' => RequestActivityResource\ManageRecords::route('/')];
    }
}

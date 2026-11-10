<?php

namespace App\Filament\Resources;

use App\Models\OutreachRecord;

class OutreachRecordResource extends DomainResource
{
    protected static ?string $model = OutreachRecord::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Matching';

    protected static ?string $navigationLabel = 'Outreach records';

    public static function getPages(): array
    {
        return ['index' => OutreachRecordResource\ManageRecords::route('/')];
    }
}

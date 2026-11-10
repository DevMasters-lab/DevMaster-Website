<?php

namespace App\Filament\Resources;

use App\Models\Document;

class DocumentResource extends DomainResource
{
    protected static ?string $model = Document::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Documents';

    protected static ?string $navigationLabel = 'Document management';

    public static function getPages(): array
    {
        return ['index' => DocumentResource\ManageRecords::route('/')];
    }
}

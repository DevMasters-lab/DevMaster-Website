<?php

namespace App\Filament\Resources;

use App\Models\DocumentVersion;

class DocumentVersionResource extends DomainResource
{
    protected static ?string $model = DocumentVersion::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Documents';

    protected static ?string $navigationLabel = 'Document versions';

    public static function getPages(): array
    {
        return ['index' => DocumentVersionResource\ManageRecords::route('/')];
    }
}

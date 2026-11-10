<?php

namespace App\Filament\Resources;

use App\Models\PublicPage;

class PublicPageResource extends DomainResource
{
    protected static ?string $model = PublicPage::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Content and settings';

    protected static ?string $navigationLabel = 'Public pages';

    public static function getPages(): array
    {
        return ['index' => PublicPageResource\ManageRecords::route('/')];
    }
}

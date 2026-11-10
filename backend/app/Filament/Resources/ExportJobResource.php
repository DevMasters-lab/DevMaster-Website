<?php

namespace App\Filament\Resources;

use App\Models\ExportJob;
use Illuminate\Database\Eloquent\Builder;

class ExportJobResource extends DomainResource
{
    protected static ?string $model = ExportJob::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Governance';

    protected static ?string $navigationLabel = 'Reports and exports';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->where('requested_by_user_id', auth()->id());
    }

    public static function getPages(): array
    {
        return ['index' => ExportJobResource\ManageRecords::route('/')];
    }
}

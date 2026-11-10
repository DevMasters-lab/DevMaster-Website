<?php

namespace App\Filament\Resources;

use App\Filament\RelationManagers\RequestCandidates;
use App\Filament\RelationManagers\RequestOffers;
use App\Filament\RelationManagers\RequestRoles;
use App\Filament\RelationManagers\RequestTimeline;
use App\Models\CompanyRequest;

class CompanyRequestResource extends DomainResource
{
    protected static ?string $model = CompanyRequest::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Company intake';

    protected static ?string $navigationLabel = 'Company requests';

    public static function getPages(): array
    {
        return ['index' => CompanyRequestResource\ManageRecords::route('/'), 'view' => CompanyRequestResource\ViewRecord::route('/{record}')];
    }

    public static function getRelations(): array
    {
        return [RequestRoles::class, RequestCandidates::class, RequestOffers::class, RequestTimeline::class];
    }
}

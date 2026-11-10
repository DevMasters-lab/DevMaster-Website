<?php

namespace App\Filament\Resources;

use App\Models\AuditEvent;

class AuditEventResource extends DomainResource
{
    protected static ?string $model = AuditEvent::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Governance';

    protected static ?string $navigationLabel = 'Audit logs';

    public static function getPages(): array
    {
        return ['index' => AuditEventResource\ManageRecords::route('/')];
    }
}

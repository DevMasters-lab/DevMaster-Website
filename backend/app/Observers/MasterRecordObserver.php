<?php

namespace App\Observers;

use App\Services\AuditTrail;
use Illuminate\Database\Eloquent\Model;

class MasterRecordObserver
{
    public function created(Model $record): void
    {
        app(AuditTrail::class)->record($record->getTable().'.created', $record, auth()->user(), ['fields' => array_keys($record->getAttributes())]);
    }

    public function updated(Model $record): void
    {
        app(AuditTrail::class)->record($record->getTable().'.updated', $record, auth()->user(), ['fields' => array_keys($record->getChanges())]);
    }
}

<?php

namespace App\Filament\Resources\CompanyRequestResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\CompanyRequestResource;
use App\Filament\Resources\WorkflowActions;

class ViewRecord extends \Filament\Resources\Pages\ViewRecord
{
    use HandlesWorkflowErrors;

    protected static string $resource = CompanyRequestResource::class;

    protected function getHeaderActions(): array
    {
        return WorkflowActions::for($this->getRecord()->getTable());
    }
}

<?php

namespace App\Filament\Resources\ExpertProfileResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\ExpertProfileResource;
use App\Filament\Resources\WorkflowActions;

class ViewRecord extends \Filament\Resources\Pages\ViewRecord
{
    use HandlesWorkflowErrors;

    protected static string $resource = ExpertProfileResource::class;

    protected function getHeaderActions(): array
    {
        return WorkflowActions::for($this->getRecord()->getTable());
    }
}

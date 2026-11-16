<?php

namespace App\Filament\Resources\RoleResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\RoleResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ManageRecords extends ListRecords
{
    use HandlesWorkflowErrors;

    protected static string $resource = RoleResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()->label(__('Create custom role'))];
    }
}

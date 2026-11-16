<?php

namespace App\Filament\Resources\PublicPageResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\PublicPageResource;
use App\Filament\Resources\WorkflowActions;
use Filament\Resources\Pages\ManageRecords as BasePage;

class ManageRecords extends BasePage
{
    use HandlesWorkflowErrors;

    protected static string $resource = PublicPageResource::class;

    protected function getHeaderActions(): array
    {
        return WorkflowActions::header((new (static::$resource::getModel()))->getTable());
    }
}

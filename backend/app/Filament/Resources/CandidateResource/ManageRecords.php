<?php

namespace App\Filament\Resources\CandidateResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\CandidateResource;
use App\Filament\Resources\WorkflowActions;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords as BasePage;

class ManageRecords extends BasePage
{
    use HandlesWorkflowErrors;

    protected static string $resource = CandidateResource::class;

    protected function getHeaderActions(): array
    {
        return array_merge(WorkflowActions::header((new (static::$resource::getModel()))->getTable()), [CreateAction::make()->modalContentFooter(fn () => view('filament.language-switcher'))->mutateDataUsing(function (array $data): array {
            if (in_array((new (static::$resource::getModel()))->getTable(), ['organizations', 'contacts'])) {
                $data['created_by_user_id'] = auth()->id();
            }

            return $data;
        })]);
    }
}

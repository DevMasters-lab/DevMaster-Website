<?php

namespace App\Filament\Resources\RoleResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\RoleResource;
use App\Services\AccessManagementService;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;
use Throwable;

class EditRole extends EditRecord
{
    use HandlesWorkflowErrors {
        exceptionHandlesWorkflowErrors as private handleWorkflowException;
    }

    protected static string $resource = RoleResource::class;

    public function exceptionHandlesWorkflowErrors(Throwable $e, callable $stopPropagation): void
    {
        if (! isset($this->record) || ! $this->record instanceof Model || ! RoleResource::canEdit($this->record)) {
            return;
        }

        $this->handleWorkflowException($e, $stopPropagation);
    }

    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        return app(AccessManagementService::class)->updateRole(auth()->user(), $record, [
            ...$data,
            'permission_ids' => RoleResource::permissionIdsFromForm($data, $record),
        ]);
    }

    protected function getRedirectUrl(): string
    {
        return RoleResource::getUrl('index');
    }
}

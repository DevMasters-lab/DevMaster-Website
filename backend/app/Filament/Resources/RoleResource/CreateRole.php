<?php

namespace App\Filament\Resources\RoleResource;

use App\Filament\HandlesWorkflowErrors;
use App\Filament\Resources\RoleResource;
use App\Services\AccessManagementService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateRole extends CreateRecord
{
    use HandlesWorkflowErrors;

    protected static string $resource = RoleResource::class;

    protected function handleRecordCreation(array $data): Model
    {
        return app(AccessManagementService::class)->createRole(auth()->user(), [
            ...$data,
            'permission_ids' => RoleResource::permissionIdsFromForm($data),
        ]);
    }

    protected function getRedirectUrl(): string
    {
        return RoleResource::getUrl('index');
    }
}

<?php

namespace App\Filament\RelationManagers;

use App\Filament\Resources\RequestRoleResource;

class RequestRoles extends RelatedRecords
{
    protected static string $relationship = 'requestRolesByRequest';

    protected static string $resourceClass = RequestRoleResource::class;
}

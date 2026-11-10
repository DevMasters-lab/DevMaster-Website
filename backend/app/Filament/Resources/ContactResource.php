<?php

namespace App\Filament\Resources;

use App\Models\Contact;

class ContactResource extends DomainResource
{
    protected static ?string $model = Contact::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Company intake';

    protected static ?string $navigationLabel = 'Contacts';

    public static function getPages(): array
    {
        return ['index' => ContactResource\ManageRecords::route('/')];
    }
}

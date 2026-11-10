<?php

namespace App\Filament\Resources;

use App\Models\Skill;

class SkillResource extends DomainResource
{
    protected static ?string $model = Skill::class;

    protected static string|\UnitEnum|null $navigationGroup = 'Expert network';

    protected static ?string $navigationLabel = 'Skills';

    public static function getPages(): array
    {
        return ['index' => SkillResource\ManageRecords::route('/')];
    }
}

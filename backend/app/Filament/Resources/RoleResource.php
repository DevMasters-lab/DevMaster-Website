<?php

namespace App\Filament\Resources;

use App\Models\Permission;
use BezhanSalleh\FilamentShield\Facades\FilamentShield;
use BezhanSalleh\FilamentShield\Resources\Roles\RoleResource as ShieldRoleResource;
use Filament\Actions\ActionGroup;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Component;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RoleResource extends ShieldRoleResource
{
    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make()->schema([
                TextInput::make('code')
                    ->required()
                    ->regex('/^[A-Z][A-Z0-9_]{2,63}$/')
                    ->unique(ignoreRecord: true)
                    ->helperText(__('Stable uppercase code, for example OPERATIONS.'))
                    ->disabled(fn (string $operation): bool => $operation !== 'create')
                    ->dehydrated(fn (string $operation): bool => $operation === 'create'),
                TextInput::make('name')->required()->maxLength(120)->unique(ignoreRecord: true),
                Toggle::make('is_active')->default(true),
                Textarea::make('description')->maxLength(3000)->columnSpanFull(),
                Hidden::make('record_version')->dehydrated(fn (string $operation): bool => $operation === 'edit'),
                static::getSelectAllFormComponent(),
            ])->columns(['default' => 1, 'md' => 2, 'lg' => 3])->columnSpanFull(),
            static::getShieldFormComponents(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return parent::table($table)
            ->columns([
                TextColumn::make('code')->searchable()->sortable(),
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('permissions_count')->label(__('Permissions'))->counts('permissions')->badge(),
                IconColumn::make('is_active')->boolean(),
                TextColumn::make('updated_at')->dateTime('d M Y H:i')->sortable(),
            ])
            ->recordActions([ActionGroup::make([
                ViewAction::make()->label(__('Details')),
                EditAction::make(),
            ])])
            ->toolbarActions([])
            ->defaultSort('created_at', 'desc')
            ->paginated([10, 25, 50, 100])
            ->defaultPaginationPageOption(10);
    }

    public static function getTabFormComponentForCustomPermissions(): Component
    {
        $groups = static::getPermissionGroups();
        $sections = [];

        foreach ($groups as $module => $permissions) {
            $sections[] = Section::make(__('filament-shield::filament-shield.permission_groups.'.$module))
                ->description(in_array($module, ['document_versions', 'notifications'], true)
                    ? __('filament-shield::filament-shield.permission_help.'.$module)
                    : null)
                ->compact()
                ->collapsible()
                ->schema([
                    static::getCheckboxListFormComponent(
                        name: 'permissions_'.$module,
                        options: $permissions,
                        searchable: false,
                        columns: ['default' => 1, 'sm' => 2, 'lg' => 4],
                    ),
                ])
                ->columnSpanFull();
        }

        return Tab::make('custom_permissions')
            ->label(__('filament-shield::filament-shield.custom'))
            ->badge(array_sum(array_map('count', $groups)))
            ->schema($sections)
            ->columns(1);
    }

    /** @return array<string, array<string, string>> */
    public static function getPermissionGroups(bool $localized = true): array
    {
        $groups = [];
        $permissions = FilamentShield::getCustomPermissions($localized && static::shield()->hasLocalizedPermissionLabels()) ?? [];

        foreach ($permissions as $permission => $label) {
            $module = explode('.', $permission, 2)[0];
            $groups[$module][$permission] = $label;
        }

        return $groups;
    }

    public static function getPages(): array
    {
        return [
            'index' => RoleResource\ManageRecords::route('/'),
            'create' => RoleResource\CreateRole::route('/create'),
            'edit' => RoleResource\EditRole::route('/{record}/edit'),
        ];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can('roles.view') ?? false;
    }

    public static function canCreate(): bool
    {
        return auth()->user()?->can('roles.create') ?? false;
    }

    public static function getCreateAuthorizationResponse(): Response
    {
        return static::canCreate() ? Response::allow() : Response::deny();
    }

    public static function canEdit(Model $record): bool
    {
        return (auth()->user()?->can('roles.update') ?? false)
            && ! $record->is_system
            && ! auth()->user()->roles->contains('id', $record->getKey());
    }

    public static function getEditAuthorizationResponse(Model $record): Response
    {
        return static::canEdit($record) ? Response::allow() : Response::deny();
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }

    /** @return list<string> */
    public static function permissionIdsFromForm(array $data, ?Model $record = null): array
    {
        $input = [];
        $rules = [];

        foreach (static::getPermissionGroups(localized: false) as $module => $permissions) {
            $field = 'permissions_'.$module;
            $input[$field] = $data[$field] ?? [];
            $rules[$field] = ['array'];
            $rules[$field.'.*'] = [
                'string',
                'distinct',
                Rule::in(array_keys($permissions)),
                Rule::exists(Permission::class, 'name')->where('guard_name', 'web'),
            ];
        }

        $validated = Validator::make($input, $rules)->validate();
        $permissionNames = array_merge(...array_values($validated));

        if ($record !== null) {
            $permissionNames = array_merge($permissionNames, $record->permissions()
                ->where('guard_name', 'web')
                ->whereNotIn('name', array_keys(config('filament-shield.custom_permissions', [])))
                ->pluck('name')->all());
        }

        return Permission::where('guard_name', 'web')
            ->whereIn('name', $permissionNames)
            ->pluck('id')->all();
    }
}

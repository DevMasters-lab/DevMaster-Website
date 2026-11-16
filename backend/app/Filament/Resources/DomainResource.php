<?php

namespace App\Filament\Resources;

use App\Policies\DomainPolicy;
use App\Support\Localization;
use Filament\Actions\Action;
use Filament\Actions\ActionGroup;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

abstract class DomainResource extends Resource
{
    /** @var array<string, array{group: string, sort: int, icon: Heroicon}> */
    private const NAVIGATION = [
        'company_requests' => ['group' => 'Company intake', 'sort' => 10, 'icon' => Heroicon::OutlinedClipboardDocumentList],
        'documents' => ['group' => 'Documents', 'sort' => 10, 'icon' => Heroicon::OutlinedFolderOpen],
        'document_versions' => ['group' => 'Documents', 'sort' => 20, 'icon' => Heroicon::OutlinedDocumentDuplicate],
        'public_pages' => ['group' => 'Website content', 'sort' => 10, 'icon' => Heroicon::OutlinedGlobeAlt],
        'users' => ['group' => 'Access management', 'sort' => 10, 'icon' => Heroicon::OutlinedUsers],
        'notification_templates' => ['group' => 'Settings', 'sort' => 10, 'icon' => Heroicon::OutlinedBell],
        'system_settings' => ['group' => 'Settings', 'sort' => 20, 'icon' => Heroicon::OutlinedCog6Tooth],
    ];

    public static function getNavigationGroup(): string|\UnitEnum|null
    {
        $group = self::NAVIGATION[(new (static::getModel()))->getTable()]['group'] ?? parent::getNavigationGroup();

        return is_string($group) ? __($group) : $group;
    }

    public static function getNavigationSort(): ?int
    {
        return self::NAVIGATION[(new (static::getModel()))->getTable()]['sort'] ?? parent::getNavigationSort();
    }

    public static function getNavigationIcon(): string|\BackedEnum|Htmlable|null
    {
        return self::NAVIGATION[(new (static::getModel()))->getTable()]['icon'] ?? parent::getNavigationIcon();
    }

    public static function getNavigationLabel(): string|Htmlable
    {
        return __(parent::getNavigationLabel());
    }

    public static function getModelLabel(): string
    {
        return Localization::label(Str::singular((new (static::getModel()))->getTable()));
    }

    public static function getPluralModelLabel(): string
    {
        return Localization::label((new (static::getModel()))->getTable());
    }

    public static function permission(): string
    {
        return (new DomainPolicy((new (static::getModel()))->getTable()))->permission();
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can(static::permission()) ?? false;
    }

    public static function canCreate(): bool
    {
        $table = (new (static::getModel()))->getTable();

        return in_array($table, ['organizations', 'contacts', 'skills', 'services'], true)
            && auth()->check()
            && (new DomainPolicy($table))->create(auth()->user());
    }

    public static function canEdit(Model $record): bool
    {
        return in_array($record->getTable(), ['organizations', 'contacts', 'skills', 'services'], true)
            && auth()->check()
            && (new DomainPolicy($record->getTable()))->update(auth()->user(), $record);
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function fields(): array
    {
        $dictionary = json_decode(file_get_contents(database_path('schema/dictionary.json')), true);

        return $dictionary[(new (static::getModel()))->getTable()];
    }

    public static function infolist(Schema $schema): Schema
    {
        $fields = [];
        foreach (static::fields() as $field) {
            $name = $field['name'];
            if (in_array($name, ['password_hash', 'remember_token', 'app_authentication_secret', 'app_authentication_recovery_codes', 'refresh_token_hash', 'object_key', 'bucket_name'])) {
                continue;
            }$entry = TextEntry::make($name)->label(Localization::label($name));
            if (in_array($name, ['status', 'application_status', 'network_status', 'decision', 'response_type', 'scan_status', 'work_mode', 'channel', 'document_type'])) {
                $entry->formatStateUsing(fn ($state) => Localization::status($state));
            }
            if (in_array($name, ['scan_message', 'last_error', 'error_message'])) {
                $entry->formatStateUsing(fn ($state) => is_string($state) ? __($state) : $state);
            }
            if ($field['type'] === 'jsonb') {
                $entry->formatStateUsing(fn ($state) => is_array($state) ? json_encode($state, JSON_PRETTY_PRINT) : $state);
            }if (in_array($field['type'], ['text', 'jsonb'])) {
                $entry->columnSpanFull();
            }$fields[] = $entry;
        }

        return $schema->components($fields)->columns(2);
    }

    public static function table(Table $table): Table
    {
        $fields = static::fields();
        $names = array_column($fields, 'name');
        $preferred = ['reference_no', 'expert_code', 'organization_code', 'display_name', 'full_name', 'name', 'title', 'role_title', 'code', 'event_type', 'action', 'recipient_address', 'original_filename', 'decision', 'response_type', 'status', 'application_status', 'network_status', 'submitted_at', 'created_at', 'occurred_at'];
        $context = match ((new (static::getModel()))->getTable()) {
            'users' => ['email' => 'Email'],
            'company_requests' => ['submitted_company_name' => 'Company', 'submitted_contact_name' => 'Contact'],
            'document_versions' => ['document.title' => 'Document', 'scan_status' => 'Scan'],
            default => []
        };
        $columns = [];
        foreach ($context as $name => $label) {
            $column = TextColumn::make($name)->label($label)->placeholder('—')->sortable()->limit(40);
            if ($name === 'scan_status') {
                $column->formatStateUsing(fn ($state) => Localization::status($state));
            } elseif (str_ends_with($name, '_on')) {
                $column->date();
            } elseif (str_ends_with($name, '_at')) {
                $column->dateTime('d M Y H:i');
            } elseif (! in_array($name, ['version_no', 'currentVersion.version_no', 'offerVersion.version_no', 'scan_status'])) {
                $column->searchable();
            }$columns[] = $column;
        }
        foreach (array_slice(array_values(array_intersect($preferred, $names)), 0, 7) as $n) {
            $c = TextColumn::make($n)->label(Str::headline($n))->sortable()->limit(48);
            if (str_contains($n, 'status') || in_array($n, ['decision', 'response_type'])) {
                $c->formatStateUsing(fn ($state) => Localization::status($state))->badge()->color(fn ($state) => match ($state) {
                    'APPROVED','ACTIVE','ACCEPTED','SELECTED','CLEAN','PUBLISHED' => 'success','REJECTED','DECLINED','INFECTED','FAILED' => 'danger',default => 'primary'
                });
            } elseif (str_ends_with($n, '_at')) {
                $c->dateTime('d M Y H:i');
            } else {
                $c->searchable();
            }$columns[] = $c;
        }
        if (! $columns) {
            $columns = [TextColumn::make('id')->copyable()];
        }$filters = [];
        foreach ($fields as $f) {
            if (in_array($f['name'], ['status', 'application_status', 'network_status'])) {
                $enum = Str::studly($f['type']);
                $class = 'App\\Enums\\'.$enum;
                if (enum_exists($class)) {
                    $filters[] = SelectFilter::make($f['name'])->options(collect($class::cases())->mapWithKeys(fn ($c) => [$c->value => Localization::status($c->value)])->all());
                }
            }
        }
        $viewActions = array_key_exists('view', static::getPages()) ? [ViewAction::make()->label(__('Open record'))] : [];

        $recordActions = array_merge($viewActions, [
            Action::make('inspect')
                ->label(__('Details'))
                ->authorize(fn (): bool => Gate::allows(static::permission()))
                ->modalHeading(fn ($record) => static::getModelLabel().' · '.__('Details'))
                ->modalContent(fn ($record) => view('filament.record-details', ['record' => $record]))
                ->modalSubmitAction(false),
        ], static::workflowActions());

        return $table
            ->columns($columns)
            ->filters($filters)
            ->recordActions([ActionGroup::make($recordActions)])
            ->defaultSort(in_array('created_at', $names) ? 'created_at' : (in_array('occurred_at', $names) ? 'occurred_at' : 'id'), 'desc')
            ->paginated([10, 25, 50, 100])
            ->defaultPaginationPageOption(10);
    }

    protected static function workflowActions(): array
    {
        return WorkflowActions::for((new (static::getModel()))->getTable());
    }
}

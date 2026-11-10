<?php

namespace App\Filament\Resources;

use App\Models\Organization;
use App\Models\Skill;
use App\Policies\DomainPolicy;
use App\Support\Localization;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Contracts\Support\Htmlable;
use Illuminate\Support\Str;

abstract class DomainResource extends Resource
{
    public static function getNavigationGroup(): string|\UnitEnum|null
    {
        $group = parent::getNavigationGroup();

        return is_string($group) ? __($group) : $group;
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
        return DomainPolicy::MODULES[(new (static::getModel()))->getTable()];
    }

    public static function canViewAny(): bool
    {
        return auth()->user()?->can(static::permission()) ?? false;
    }

    public static function canCreate(): bool
    {
        return (new DomainPolicy((new (static::getModel()))->getTable()))->create(auth()->user());
    }

    public static function canEdit($record): bool
    {
        return (new DomainPolicy($record->getTable()))->update(auth()->user(), $record);
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function fields(): array
    {
        $dictionary = json_decode(file_get_contents(database_path('schema/dictionary.json')), true);

        return $dictionary[(new (static::getModel()))->getTable()];
    }

    public static function form(Schema $schema): Schema
    {
        $allowed = ['organization_code', 'name', 'registration_number', 'website', 'address', 'is_active', 'organization_id', 'full_name', 'job_title', 'email', 'phone', 'is_primary', 'code', 'description', 'sort_order'];
        $fields = [];
        foreach (static::fields() as $f) {
            $n = $f['name'];
            if (! in_array($n, $allowed)) {
                continue;
            }
            if ($f['type'] === 'boolean') {
                $input = Toggle::make($n)->default($f['default'] === 'true');
            } elseif ($n === 'organization_id') {
                $input = Select::make($n)->options(fn () => Organization::where('is_active', true)->pluck('name', 'id'))->searchable();
            } elseif ($f['type'] === 'text') {
                $input = Textarea::make($n)->rows(4)->columnSpanFull();
            } else {
                $input = TextInput::make($n);
                if (preg_match('/varchar\((\d+)\)/', $f['type'], $m)) {
                    $input->maxLength((int) $m[1]);
                }if ($f['type'] === 'integer') {
                    $input->numeric()->default(0);
                }if (in_array($n, ['email'])) {
                    $input->email();
                }
            }
            if (! $f['nullable']) {
                $input->required();
            }$fields[] = $input;
        }

        if (in_array((new (static::getModel()))->getTable(), ['services', 'skills'])) {
            $fields[] = TextInput::make('translations.km.name')->label(__('Khmer name'))->maxLength(200);
            $fields[] = Textarea::make('translations.km.description')->label(__('Khmer description'))->columnSpanFull();
        }

        return $schema->components($fields)->columns(2);
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
            'expert_profiles' => ['professional_title' => 'Expertise', 'contact_email' => 'Email'],
            'expert_offers' => ['expertProfile.full_name' => 'Expert', 'request.reference_no' => 'Request', 'currentVersion.version_no' => 'Version'],
            'candidates' => ['expertProfile.full_name' => 'Expert', 'request.reference_no' => 'Request'],
            'placements' => ['expertProfile.full_name' => 'Expert', 'company_name_snapshot' => 'Company', 'request.reference_no' => 'Request'],
            'availabilities' => ['expertProfile.full_name' => 'Expert', 'starts_on' => 'From', 'ends_on' => 'Through'],
            'offer_versions' => ['offer.reference_no' => 'Offer', 'version_no' => 'Version'],
            'selection_decisions' => ['offer.reference_no' => 'Offer', 'offer.expertProfile.full_name' => 'Expert'],
            'offer_responses' => ['offerVersion.offer.reference_no' => 'Offer', 'offerVersion.version_no' => 'Version'],
            'outreach_records' => ['candidate.expertProfile.full_name' => 'Expert', 'follow_up_at' => 'Follow up'],
            'document_versions' => ['document.title' => 'Document', 'scan_status' => 'Scan'],
            'export_jobs' => ['export_type' => 'Report', 'format' => 'Format', 'requestedByUser.display_name' => 'Requested by'],
            'notifications' => ['recipientUser.display_name' => 'Recipient'],
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
        if ((new (static::getModel()))->getTable() === 'expert_profiles') {
            $filters[] = SelectFilter::make('skill')->options(fn () => Skill::where('is_active', true)->pluck('name', 'id'))->query(fn ($query, $data) => empty($data['value']) ? $query : $query->whereHas('skills', fn ($q) => $q->where('skills.id', $data['value'])));
        }
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

        return $table->columns($columns)->filters($filters)->recordActions(array_merge($viewActions, [Action::make('inspect')->label(__('Details'))->modalHeading(fn ($record) => static::getModelLabel().' · '.__('Details'))->modalContent(fn ($record) => view('filament.record-details', ['record' => $record]))->modalSubmitAction(false), EditAction::make()->modalContentFooter(fn () => view('filament.language-switcher'))], static::workflowActions()))->defaultSort(in_array('created_at', $names) ? 'created_at' : (in_array('occurred_at', $names) ? 'occurred_at' : 'id'), 'desc')->defaultPaginationPageOption(20)->paginationPageOptions([20, 50, 100]);
    }

    protected static function workflowActions(): array
    {
        return WorkflowActions::for((new (static::getModel()))->getTable());
    }
}

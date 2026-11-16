<?php

namespace App\Filament\Resources;

use App\Enums\RequestStatus;
use App\Models\Contact;
use App\Models\Organization;
use App\Models\Role;
use App\Models\User;
use App\Services\AccessManagementService;
use App\Services\AdminWorkflow;
use App\Services\ConfigurationService;
use App\Services\DocumentService;
use App\Support\Localization;
use Filament\Actions\Action;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\MarkdownEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class WorkflowActions
{
    public static function for(string $table): array
    {
        $a = [];
        if ($table === 'company_requests') {
            $a[] = Action::make('reviewRequest')->label(__('Review / clarify'))->fillForm(fn ($record) => $record->only(['record_version', 'status', 'requirements', 'organization_id', 'contact_id', 'owner_user_id']))->schema([Hidden::make('record_version'), Select::make('status')->options(collect(RequestStatus::cases())->mapWithKeys(fn ($c) => [$c->value => Localization::status($c->value)]))->required(), Textarea::make('requirements')->required(), Select::make('organization_id')->options(fn () => Organization::pluck('name', 'id'))->searchable(), Select::make('contact_id')->options(fn () => Contact::pluck('full_name', 'id'))->searchable(), Select::make('owner_user_id')->options(fn () => User::where('status', 'ACTIVE')->whereHas('roles', fn ($q) => $q->whereIn('code', ['ADMIN', 'STAFF']))->pluck('display_name', 'id')), Textarea::make('note')])->action(fn ($record, $data) => app(AdminWorkflow::class)->updateRequest(auth()->user(), $record, $data));
            $a[] = Action::make('addRole')->schema([TextInput::make('role_title')->required(), TextInput::make('headcount')->integer()->minValue(1)->default(1)->required(), Textarea::make('scope'), Select::make('work_mode')->options(['REMOTE' => __('Remote'), 'ONSITE' => __('Onsite'), 'HYBRID' => __('Hybrid')]), TextInput::make('location_text')])->action(fn ($record, $data) => app(AdminWorkflow::class)->addRole(auth()->user(), $record, $data));
        }
        if ($table === 'users') {
            $a[] = Action::make('roles')->fillForm(fn ($record) => ['role_ids' => $record->roles->pluck('id')->all()])->schema([CheckboxList::make('role_ids')->options(fn () => Role::where('is_active', true)->pluck('name', 'id'))->required()])->action(fn ($record, $data) => app(AccessManagementService::class)->assignRoles(auth()->user(), $record, $data['role_ids']));
            $a[] = Action::make('accountStatus')->schema([Select::make('status')->options(['ACTIVE' => __('Active'), 'SUSPENDED' => __('Suspended'), 'DISABLED' => __('Disabled')])->required()])->action(fn ($record, $data) => app(AccessManagementService::class)->changeStatus(auth()->user(), $record, $data['status']));
        }
        if ($table === 'public_pages') {
            $a[] = Action::make('editContent')->fillForm(fn ($record) => $record->only(['slug', 'locale', 'title', 'body_markdown', 'status']))->schema(self::pageFields())->action(fn ($record, $data) => app(ConfigurationService::class)->page(auth()->user(), $data, $record));
        }
        if ($table === 'document_versions') {
            $a[] = Action::make('download')
                ->visible(fn ($record): bool => Gate::allows('document_versions.view') && Gate::allows('view', $record))
                ->authorize(fn ($record): bool => Gate::allows('document_versions.view') && Gate::allows('view', $record))
                ->action(function ($record) {
                    Gate::authorize('document_versions.view');
                    Gate::authorize('view', $record);

                    return Storage::disk('private')->download($record->object_key, $record->original_filename, ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store']);
                });
        }

        foreach ($a as $action) {
            if ($action->getName() !== 'download') {
                self::restrict($action, match ($action->getName()) {
                    'reviewRequest', 'addRole' => ['requests.update'],
                    'roles' => ['users.update', 'roles.update'],
                    'accountStatus' => ['users.update'],
                    'editContent' => ['content.update'],
                });
                $action->modalContentFooter(fn () => view('filament.language-switcher'));
            }
        }

        return $a;
    }

    public static function pageFields(): array
    {
        return [TextInput::make('slug')->required(), Select::make('locale')->options(['km' => 'ខ្មែរ', 'en' => 'English'])->default('km')->required(), TextInput::make('title')->required(), MarkdownEditor::make('body_markdown')->required(), Select::make('status')->options(['DRAFT' => __('Draft'), 'PUBLISHED' => __('Published'), 'ARCHIVED' => __('Archived')])->default('DRAFT')->required()];
    }

    public static function header(string $table): array
    {
        $actions = match ($table) {
            'users' => [Action::make('inviteStaff')->schema([TextInput::make('display_name')->required()->maxLength(200), TextInput::make('email')->email()->required()->maxLength(254), CheckboxList::make('role_ids')->options(fn () => Role::where('is_active', true)->where('code', '<>', 'EXPERT')->pluck('name', 'id'))->required()])->action(fn ($data) => app(AccessManagementService::class)->inviteStaff(auth()->user(), $data))],
            'documents' => [Action::make('uploadDocument')->schema([FileUpload::make('file')->acceptedFileTypes(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])->maxSize(10240)->storeFiles(false)->required(), Select::make('document_type')->options(['OFFER_ATTACHMENT' => __('Offer attachment'), 'RESPONSE_EVIDENCE' => __('Response evidence'), 'OTHER' => __('Other')])->required()])->action(function ($data) {
                Gate::authorize('documents.create');
                app(DocumentService::class)->upload($data['file'], $data['document_type'], auth()->user());
            })],
            'public_pages' => [Action::make('createPage')->schema(self::pageFields())->action(fn ($data) => app(ConfigurationService::class)->page(auth()->user(), $data))],
            'notification_templates' => [Action::make('newTemplateVersion')->schema([TextInput::make('template_key')->required(), Select::make('channel')->options(['EMAIL' => __('Email'), 'SMS' => 'SMS'])->default('EMAIL')->required(), Select::make('locale')->options(['km' => 'ខ្មែរ', 'en' => 'English'])->default('km')->required(), TextInput::make('subject'), Textarea::make('body')->required(), Toggle::make('is_active')->default(true)])->action(fn ($data) => app(ConfigurationService::class)->template(auth()->user(), $data))],
            'system_settings' => [Action::make('saveSetting')->schema([Select::make('key')->options(['business.contact' => __('Business contact'), 'business.display_name' => __('Display name'), 'website.announcement' => __('Website announcement')])->required(), Textarea::make('value')->required(), Textarea::make('description')->required()])->action(fn ($data) => app(ConfigurationService::class)->setting(auth()->user(), $data['key'], ['text' => $data['value']], $data['description']))],
            default => []
        };
        foreach ($actions as $action) {
            self::restrict($action, match ($action->getName()) {
                'inviteStaff' => ['users.create', 'roles.update'],
                'uploadDocument' => ['documents.create'],
                'createPage' => ['content.create'],
                'newTemplateVersion' => ['notifications.create', 'notifications.update'],
                'saveSetting' => ['settings.create', 'settings.update'],
            }, any: in_array($action->getName(), ['newTemplateVersion', 'saveSetting'], true));
            $action->modalContentFooter(fn () => view('filament.language-switcher'));
        }

        return $actions;
    }

    /** @param list<string> $permissions */
    private static function restrict(Action $action, array $permissions, bool $any = false): Action
    {
        $authorized = fn (): bool => $any ? Gate::any($permissions) : Gate::check($permissions);

        return $action->visible($authorized)->authorize($authorized);
    }
}

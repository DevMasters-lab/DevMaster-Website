<?php

namespace App\Filament\Resources;

use App\Enums\OfferStatus;
use App\Enums\PlacementStatus;
use App\Enums\RequestStatus;
use App\Models\Contact;
use App\Models\DocumentVersion;
use App\Models\ExpertProfile;
use App\Models\OfferVersion;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\RequestRole;
use App\Models\Role;
use App\Models\User;
use App\Services\AccessManagementService;
use App\Services\AdminWorkflow;
use App\Services\ConfigurationService;
use App\Services\DocumentService;
use App\Services\ExpertApplicationService;
use App\Services\ExportService;
use App\Services\OfferService;
use App\Support\Localization;
use Filament\Actions\Action;
use Filament\Forms\Components\CheckboxList;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Hidden;
use Filament\Forms\Components\MarkdownEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Utilities\Get;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WorkflowActions
{
    public static function terms(): array
    {
        return [TextInput::make('role_title')->required()->maxLength(200), Textarea::make('scope')->required()->maxLength(20000), Select::make('work_mode')->options(['REMOTE' => __('Remote'), 'ONSITE' => __('Onsite'), 'HYBRID' => __('Hybrid')]), TextInput::make('location_text')->maxLength(255), DatePicker::make('starts_on'), DatePicker::make('ends_on')->afterOrEqual('starts_on'), TextInput::make('compensation_amount')->numeric()->minValue(0)->required(), Select::make('currency')->options(array_combine(config('devmasters.currencies'), config('devmasters.currencies')))->required(), Select::make('rate_basis')->options(array_combine(['HOUR', 'DAY', 'MONTH', 'FIXED', 'OTHER'], [__('Hour'), __('Day'), __('Month'), __('Fixed'), __('Other')]))->required(), TextInput::make('rate_basis_detail'), Select::make('payer_type')->options(['DEVMASTERS' => __('DevMasters'), 'REQUESTING_COMPANY' => __('Requesting company'), 'OTHER' => __('Other')])->required(), TextInput::make('payer_name_snapshot')->required(), Textarea::make('payment_terms')->required(), Textarea::make('terms')->required()->helperText(__('Explain timing explicitly if start or end dates are unspecified.')), DateTimePicker::make('expires_at')->required()];
    }

    public static function for(string $table): array
    {
        $a = [];
        $user = fn () => auth()->user();
        if ($table === 'expert_profiles') {
            $a[] = Action::make('review')->visible(fn () => auth()->user()->can('experts.review'))->schema([Select::make('decision')->options(['APPROVED' => __('Approve'), 'REJECTED' => __('Reject'), 'CORRECTIONS_REQUIRED' => __('Request corrections')])->required(), Textarea::make('comments'), Textarea::make('feedback_to_expert')])->action(fn ($record, $data) => app(ExpertApplicationService::class)->review(auth()->user(), $record, $data));
            $a[] = Action::make('invite')->requiresConfirmation()->visible(fn ($record) => auth()->user()->can('experts.activate') && $record->application_status === 'APPROVED' && ! $record->user_id)->action(fn ($record) => app(ExpertApplicationService::class)->invite(auth()->user(), $record));
        }
        if ($table === 'company_requests') {
            $a[] = Action::make('reviewRequest')->label(__('Review / clarify'))->fillForm(fn ($record) => $record->only(['record_version', 'status', 'requirements', 'organization_id', 'contact_id', 'owner_user_id']))->schema([Hidden::make('record_version'), Select::make('status')->options(collect(RequestStatus::cases())->mapWithKeys(fn ($c) => [$c->value => Localization::status($c->value)]))->required(), Textarea::make('requirements')->required(), Select::make('organization_id')->options(fn () => Organization::pluck('name', 'id'))->searchable(), Select::make('contact_id')->options(fn () => Contact::pluck('full_name', 'id'))->searchable(), Select::make('owner_user_id')->options(fn () => User::where('status', 'ACTIVE')->whereHas('roles', fn ($q) => $q->whereIn('code', ['ADMIN', 'STAFF']))->pluck('display_name', 'id')), Textarea::make('note')])->action(fn ($record, $data) => app(AdminWorkflow::class)->updateRequest(auth()->user(), $record, $data));
            $a[] = Action::make('addRole')->schema([TextInput::make('role_title')->required(), TextInput::make('headcount')->integer()->minValue(1)->default(1)->required(), Textarea::make('scope'), Select::make('work_mode')->options(['REMOTE' => __('Remote'), 'ONSITE' => __('Onsite'), 'HYBRID' => __('Hybrid')]), TextInput::make('location_text')])->action(fn ($record, $data) => app(AdminWorkflow::class)->addRole(auth()->user(), $record, $data));
            $a[] = Action::make('shortlist')->visible(fn () => auth()->user()->can('matching.manage'))->schema([Select::make('expert_id')->options(fn () => ExpertProfile::where('application_status', 'APPROVED')->where('network_status', 'ACTIVE')->pluck('full_name', 'id'))->searchable()->required(), Textarea::make('internal_notes')])->action(fn ($record, $data) => app(AdminWorkflow::class)->shortlist(auth()->user(), $record, ExpertProfile::findOrFail($data['expert_id']), $data['internal_notes'] ?? null));
        }
        if ($table === 'candidates') {
            $a[] = Action::make('recordOutreach')->schema([Select::make('channel')->options(array_combine(['EMAIL', 'PHONE', 'PORTAL', 'IN_PERSON'], [__('Email'), __('Phone'), __('Portal'), __('In person')]))->required(), Textarea::make('summary')->required(), Select::make('interest_result')->options(array_combine(['INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE'], [__('Interested'), __('Not interested'), __('No response')])), DateTimePicker::make('follow_up_at')])->action(fn ($record, $data) => app(AdminWorkflow::class)->outreach(auth()->user(), $record, $data));
            $a[] = Action::make('prepareOffer')->visible(fn () => auth()->user()->can('offers.prepare'))->schema(array_merge([Select::make('request_role_id')->options(fn ($record) => RequestRole::where('request_id', $record->request_id)->pluck('role_title', 'id'))], self::terms()))->action(fn ($record, $data) => app(OfferService::class)->draft(auth()->user(), $data + ['candidate_id' => $record->id]));
        }
        if ($table === 'expert_offers') {
            $a[] = Action::make('issue')->requiresConfirmation()->fillForm(fn ($record) => ['record_version' => $record->record_version])->schema([Hidden::make('record_version')])->visible(fn ($record) => auth()->user()->can('offers.issue') && $record->status === 'DRAFT')->action(fn ($record, $data) => app(OfferService::class)->issue(auth()->user(), $record, (int) $data['record_version']));
            $a[] = Action::make('revise')->visible(fn () => auth()->user()->can('offers.prepare'))->fillForm(fn ($record) => $record->currentVersion->only(OfferService::TERMS) + ['record_version' => $record->record_version])->schema(array_merge([Hidden::make('record_version')], self::terms()))->action(fn ($record, $data) => app(OfferService::class)->revise(auth()->user(), $record, (int) $data['record_version'], $data));
            $a[] = Action::make('selection')->fillForm(fn ($record) => ['expected_version_id' => $record->current_version_id])->visible(fn () => auth()->user()->can('selections.decide'))->schema([Hidden::make('expected_version_id'), Select::make('decision')->options(['SELECTED' => __('Select for placement'), 'NOT_SELECTED' => __('Not selected / reverse selection')])->required(), Textarea::make('reason')->required()->minLength(3)])->requiresConfirmation()->action(fn ($record, $data) => app(OfferService::class)->decide(auth()->user(), $record, $data));
            $a[] = Action::make('recordResponse')->fillForm(fn ($record) => ['offer_version_id' => $record->current_version_id])->visible(fn () => auth()->user()->can('offers.record-response'))->schema([Hidden::make('offer_version_id'), Select::make('response_type')->options(['ACCEPTED' => __('Accepted'), 'DECLINED' => __('Declined'), 'CHANGES_REQUESTED' => __('Changes requested')])->required(), Select::make('channel')->options(['EMAIL' => __('Email'), 'PHONE' => __('Phone'), 'IN_PERSON' => __('In person')])->required(), Textarea::make('evidence_summary')->required(), Select::make('evidence_version_ids')->label(__('Exact evidence files'))->multiple()->options(fn () => DocumentVersion::where('scan_status', 'CLEAN')->pluck('original_filename', 'id'))->searchable(), Textarea::make('comments')])->action(fn ($record, $data) => app(OfferService::class)->respond(auth()->user(), OfferVersion::findOrFail($data['offer_version_id']), $data + ['command_id' => (string) Str::uuid()]));
        }
        if ($table === 'offer_versions') {
            $a[] = Action::make('editDraft')->fillForm(fn ($record) => $record->only(OfferService::TERMS) + ['record_version' => $record->record_version])->schema(array_merge([Hidden::make('record_version')], self::terms()))->action(fn ($record, $data) => app(AdminWorkflow::class)->saveDraft(auth()->user(), $record, $data));
            $a[] = Action::make('attach')->schema([Select::make('file')->options(fn () => DocumentVersion::where('scan_status', 'CLEAN')->pluck('original_filename', 'id'))->searchable()->required()])->action(fn ($record, $data) => app(AdminWorkflow::class)->attach(auth()->user(), $record, DocumentVersion::findOrFail($data['file'])));
        }
        if ($table === 'placements') {
            $a[] = Action::make('updateStatus')->schema([Select::make('status')->options(['ACTIVE' => __('Active'), 'ENDED' => __('Ended')])->required(), Textarea::make('reason')->required()])->action(fn ($record, $data) => app(AdminWorkflow::class)->placementStatus(auth()->user(), $record, $data['status'], $data['reason']));
        }
        if ($table === 'outbox_events') {
            $a[] = Action::make('retry')->requiresConfirmation()->visible(fn ($record) => $record->status === 'FAILED')->action(function ($record) {
                Gate::authorize('notifications.manage');
                $record->update(['status' => 'PENDING', 'available_at' => now(), 'locked_until' => null]);
            });
        }
        if ($table === 'users') {
            $a[] = Action::make('roles')->visible(fn () => auth()->user()->can('roles.manage'))->fillForm(fn ($record) => ['role_ids' => $record->roles->pluck('id')->all()])->schema([CheckboxList::make('role_ids')->options(fn () => Role::where('is_active', true)->pluck('name', 'id'))->required()])->action(fn ($record, $data) => app(AccessManagementService::class)->assignRoles(auth()->user(), $record, $data['role_ids']));
            $a[] = Action::make('accountStatus')->schema([Select::make('status')->options(['ACTIVE' => __('Active'), 'SUSPENDED' => __('Suspended'), 'DISABLED' => __('Disabled')])->required()])->action(fn ($record, $data) => app(AccessManagementService::class)->changeStatus(auth()->user(), $record, $data['status']));
        }
        if ($table === 'roles') {
            $a[] = Action::make('permissions')->label(__('Edit custom role'))->visible(fn ($record) => ! $record->is_system)->fillForm(fn ($record) => $record->only(['record_version', 'name', 'description', 'is_active']) + ['permission_ids' => $record->permissions->pluck('id')->all()])->schema(array_merge([Hidden::make('record_version')], self::roleFields(false)))->action(fn ($record, $data) => app(AccessManagementService::class)->updateRole(auth()->user(), $record, $data));
        }
        if ($table === 'public_pages') {
            $a[] = Action::make('editContent')->fillForm(fn ($record) => $record->only(['slug', 'locale', 'title', 'body_markdown', 'status']))->schema(self::pageFields())->action(fn ($record, $data) => app(ConfigurationService::class)->page(auth()->user(), $data, $record));
        }
        if ($table === 'export_jobs') {
            $a[] = Action::make('downloadExport')->visible(fn ($record) => $record->status === 'COMPLETED')->action(function ($record) {
                Gate::authorize('reports.export');
                abort_unless($record->requested_by_user_id === auth()->id() && $record->expires_at?->isFuture(), 403, 'Export is unavailable.');
                $v = $record->outputDocumentVersion;
                Gate::authorize('view', $v);

                return Storage::disk('private')->download($v->object_key, $v->original_filename, ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store']);
            });
        }
        if ($table === 'document_versions') {
            $a[] = Action::make('download')->visible(fn ($record) => $record->scan_status === 'CLEAN')->action(function ($record) {
                Gate::authorize('view', $record);

                return Storage::disk('private')->download($record->object_key, $record->original_filename, ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store']);
            });
        }

        foreach ($a as $action) {
            if (! in_array($action->getName(), ['download', 'downloadExport'])) {
                $action->modalContentFooter(fn () => view('filament.language-switcher'));
            }
        }

        return $a;
    }

    public static function pageFields(): array
    {
        return [TextInput::make('slug')->required(), Select::make('locale')->options(['km' => 'ខ្មែរ', 'en' => 'English'])->default('km')->required(), TextInput::make('title')->required(), MarkdownEditor::make('body_markdown')->required(), Select::make('status')->options(['DRAFT' => __('Draft'), 'PUBLISHED' => __('Published'), 'ARCHIVED' => __('Archived')])->default('DRAFT')->required()];
    }

    public static function roleFields(bool $creating = true): array
    {
        return array_merge($creating ? [TextInput::make('code')->required()->regex('/^[A-Z][A-Z0-9_]{2,63}$/')->helperText(__('Stable uppercase code, for example OPERATIONS.'))] : [], [TextInput::make('name')->required()->maxLength(120), Textarea::make('description')->maxLength(3000), Toggle::make('is_active')->default(true), CheckboxList::make('permission_ids')->options(fn () => Permission::pluck('description', 'id'))->columns(2)]);
    }

    public static function header(string $table): array
    {
        $actions = match ($table) {
            'roles' => [Action::make('createCustomRole')->schema(self::roleFields())->action(fn ($data) => app(AccessManagementService::class)->createRole(auth()->user(), $data))],
            'users' => [Action::make('inviteStaff')->visible(fn () => auth()->user()->can('roles.manage'))->schema([TextInput::make('display_name')->required()->maxLength(200), TextInput::make('email')->email()->required()->maxLength(254), CheckboxList::make('role_ids')->options(fn () => Role::where('is_active', true)->where('code', '<>', 'EXPERT')->pluck('name', 'id'))->required()])->action(fn ($data) => app(AccessManagementService::class)->inviteStaff(auth()->user(), $data))],
            'documents' => [Action::make('uploadDocument')->schema([FileUpload::make('file')->acceptedFileTypes(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'])->maxSize(10240)->storeFiles(false)->required(), Select::make('document_type')->options(['OFFER_ATTACHMENT' => __('Offer attachment'), 'RESPONSE_EVIDENCE' => __('Response evidence'), 'OTHER' => __('Other')])->required()])->action(function ($data) {
                Gate::authorize('documents.view');
                app(DocumentService::class)->upload($data['file'], $data['document_type'], auth()->user());
            })],
            'public_pages' => [Action::make('createPage')->schema(self::pageFields())->action(fn ($data) => app(ConfigurationService::class)->page(auth()->user(), $data))],
            'notification_templates' => [Action::make('newTemplateVersion')->schema([TextInput::make('template_key')->required(), Select::make('channel')->options(['EMAIL' => __('Email'), 'SMS' => 'SMS'])->default('EMAIL')->required(), Select::make('locale')->options(['km' => 'ខ្មែរ', 'en' => 'English'])->default('km')->required(), TextInput::make('subject'), Textarea::make('body')->required(), Toggle::make('is_active')->default(true)])->action(fn ($data) => app(ConfigurationService::class)->template(auth()->user(), $data))],
            'system_settings' => [Action::make('saveSetting')->schema([Select::make('key')->options(['business.contact' => __('Business contact'), 'business.display_name' => __('Display name'), 'website.announcement' => __('Website announcement')])->required(), Textarea::make('value')->required(), Textarea::make('description')->required()])->action(fn ($data) => app(ConfigurationService::class)->setting(auth()->user(), $data['key'], ['text' => $data['value']], $data['description']))],
            'export_jobs' => [Action::make('requestExport')->schema([Select::make('export_type')->options(['REQUESTS' => __('Requests'), 'OFFERS' => __('Offers'), 'PLACEMENTS' => __('Placements')])->live()->required(), Select::make('format')->options(['CSV' => 'CSV', 'XLSX' => __('Excel')])->default('CSV')->required(), Select::make('filters.status')->label(__('Status'))->options(function (Get $get) {
                $enum = match ($get('export_type')) {
                    'REQUESTS' => RequestStatus::class,'OFFERS' => OfferStatus::class,'PLACEMENTS' => PlacementStatus::class,default => null
                };

                return $enum ? collect($enum::cases())->mapWithKeys(fn ($case) => [$case->value => Localization::status($case->value)])->all() : [];
            }), DatePicker::make('filters.from')->label(__('From date')), DatePicker::make('filters.to')->label(__('Through date')), TextInput::make('filters.search')->label(__('Search'))->maxLength(200)])->action(fn ($data) => app(ExportService::class)->request(auth()->user(), $data))],
            default => []
        };
        foreach ($actions as $action) {
            $action->modalContentFooter(fn () => view('filament.language-switcher'));
        }

        return $actions;
    }
}

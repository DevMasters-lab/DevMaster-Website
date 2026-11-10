<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CompanySubmissionRequest;
use App\Http\Requests\ExpertApplicationRequest;
use App\Models\CompanyRequest;
use App\Models\ConsentRecord;
use App\Models\ExpertDocument;
use App\Models\ExpertProfile;
use App\Models\PublicPage;
use App\Models\RequestActivity;
use App\Models\RequestDocument;
use App\Models\Service;
use App\Models\Skill;
use App\Services\BusinessEvents;
use App\Services\CommandService;
use App\Services\DocumentService;
use App\Support\Localization;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PublicController extends Controller
{
    public function reference()
    {
        return ['data' => ['services' => Service::where('is_active', true)->orderBy('sort_order')->get(['id', 'code', 'name', 'description', 'translations'])->map(fn ($service) => ['id' => $service->id, 'code' => $service->code, 'name' => Localization::content($service, 'name'), 'description' => Localization::content($service, 'description')]), 'skills' => Skill::where('is_active', true)->orderBy('name')->get(['id', 'code', 'name', 'translations'])->map(fn ($skill) => ['id' => $skill->id, 'code' => $skill->code, 'name' => Localization::content($skill, 'name')]), 'consent' => ['version' => config('devmasters.consent_version'), 'text' => __(config('devmasters.consent_text')), 'cv_sharing_text' => __(config('devmasters.cv_sharing_text'))]]];
    }

    public function page(string $slug)
    {
        $p = PublicPage::where('slug', $slug)->whereIn('locale', [app()->getLocale(), 'en'])->where('status', 'PUBLISHED')->orderByRaw('CASE WHEN locale = ? THEN 0 ELSE 1 END', [app()->getLocale()])->firstOrFail();

        return ['data' => $p->only(['slug', 'locale', 'title', 'body_markdown', 'published_at'])];
    }

    private function scope(Request $r): string
    {
        return 'public:'.hash('sha256', $r->session()->getId());
    }

    public function company(CompanySubmissionRequest $r, CommandService $commands)
    {
        $data = $r->safe()->except('attachments');
        $files = $r->file('attachments', []);
        $fingerprints = array_map(fn ($f) => hash_file('sha256', $f->getRealPath()), $files);
        $result = $commands->run($this->scope($r), $r->header('Idempotency-Key', ''), 'public.company', $data + ['files' => $fingerprints], function () use ($data, $files) {
            $q = CompanyRequest::create($data + ['reference_no' => 'DM-RQ-'.Str::upper(Str::random(12)), 'submission_snapshot' => ['schema_version' => 1, 'locale' => app()->getLocale(), 'data' => $data]]);
            RequestActivity::create(['request_id' => $q->id, 'actor_type' => 'PUBLIC', 'activity_type' => 'SUBMITTED']);
            foreach ($files as $file) {
                $v = app(DocumentService::class)->upload($file, 'REQUEST_FILE');
                RequestDocument::create(['request_id' => $q->id, 'document_id' => $v->document_id]);
            }
            app(BusinessEvents::class)->record('request.received', 'company_request', $q->id, null, $q->submitted_email, data: ['reference_no' => $q->reference_no]);

            return ['reference_no' => $q->reference_no, 'message_code' => 'REQUEST_RECEIVED', 'message' => 'Your request has been received. DevMasters will review it and follow up.'];
        });

        if (isset($result['message'])) {
            $result['message'] = __($result['message']);
        }

        return response()->json(['data' => $result], 201);
    }

    public function application(ExpertApplicationRequest $r, CommandService $commands)
    {
        $data = $r->safe()->except(['cv', 'consent', 'consent_version']);
        $file = $r->file('cv');
        $result = $commands->run($this->scope($r), $r->header('Idempotency-Key', ''), 'public.application', $data + ['cv_sha256' => hash_file('sha256', $file->getRealPath())], function () use ($data, $file) {
            $p = ExpertProfile::create($data + ['expert_code' => 'DM-EX-'.Str::upper(Str::random(12)), 'application_snapshot' => ['schema_version' => 1, 'locale' => app()->getLocale(), 'data' => $data]]);
            ConsentRecord::create(['expert_profile_id' => $p->id, 'purpose' => 'NETWORK_PARTICIPATION', 'policy_version' => config('devmasters.consent_version'), 'policy_text_snapshot' => __(config('devmasters.consent_text')), 'action' => 'GRANTED', 'channel' => 'PUBLIC_FORM']);
            $v = app(DocumentService::class)->upload($file, 'CV');
            ExpertDocument::create(['expert_profile_id' => $p->id, 'document_id' => $v->document_id, 'purpose' => 'CV', 'is_primary_cv' => true]);
            app(BusinessEvents::class)->record('application.received', 'expert_profile', $p->id, null, $p->contact_email, data: ['reference_no' => $p->expert_code]);

            return ['reference_no' => $p->expert_code, 'message_code' => 'APPLICATION_RECEIVED', 'message' => 'Application received. Portal access becomes available after approval and account activation.'];
        });

        if (isset($result['message'])) {
            $result['message'] = __($result['message']);
        }

        return response()->json(['data' => $result], 201);
    }
}

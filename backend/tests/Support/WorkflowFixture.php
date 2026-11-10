<?php

namespace Tests\Support;

use App\Models\Candidate;
use App\Models\CompanyRequest;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\ExpertDocument;
use App\Models\ExpertProfile;
use App\Models\RequestRole;
use App\Models\User;
use App\Services\OfferService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkflowFixture
{
    public static function make(?User $admin = null, ?CompanyRequest $request = null, ?RequestRole $role = null): array
    {
        $admin ??= User::factory()->create();
        $admin->assignRole('ADMIN');
        $user = User::factory()->create();
        $user->assignRole('EXPERT');
        $expert = ExpertProfile::create(['user_id' => $user->id, 'expert_code' => 'TEST-'.Str::random(14), 'full_name' => $user->display_name, 'contact_email' => $user->email, 'application_status' => 'APPROVED', 'network_status' => 'ACTIVE', 'application_snapshot' => ['schema_version' => 1], 'approved_at' => now(), 'activated_at' => now()]);
        $request ??= CompanyRequest::create(['reference_no' => 'TEST-RQ-'.Str::random(14), 'request_type' => 'HIRE_OUR_TEAM', 'submitted_company_name' => 'Test Company', 'submitted_contact_name' => 'Test Contact', 'submitted_email' => 'test@example.test', 'title' => 'Technical support', 'requirements' => 'A test request for specialist technical expertise.', 'submission_snapshot' => ['company' => 'Test Company']]);
        $role ??= RequestRole::create(['request_id' => $request->id, 'role_title' => 'Engineer', 'headcount' => 1]);
        $candidate = Candidate::create(['request_id' => $request->id, 'expert_profile_id' => $expert->id, 'shortlisted_by_user_id' => $admin->id]);
        $offer = app(OfferService::class)->draft($admin, ['candidate_id' => $candidate->id, 'request_role_id' => $role->id, 'role_title' => 'Engineer', 'scope' => 'Test scope', 'compensation_amount' => '100.00', 'currency' => 'USD', 'rate_basis' => 'DAY', 'payer_type' => 'REQUESTING_COMPANY', 'payer_name_snapshot' => 'Test Company', 'payment_terms' => 'Monthly payment', 'terms' => 'Start date to be mutually agreed; open-ended until a separate engagement is agreed.', 'expires_at' => now()->addDay()->toIso8601String()]);

        return compact('admin', 'user', 'expert', 'request', 'role', 'candidate', 'offer');
    }

    public static function file(array $f, string $scan = 'CLEAN'): DocumentVersion
    {
        return DB::transaction(function () use ($f, $scan) {
            $d = Document::create(['title' => 'Test CV', 'document_type' => 'CV', 'created_by_user_id' => $f['user']->id]);
            $v = DocumentVersion::create(['document_id' => $d->id, 'version_no' => 1, 'original_filename' => 'cv.pdf', 'bucket_name' => 'devmasters-private', 'object_key' => 'test/'.Str::uuid(), 'mime_type' => 'application/pdf', 'size_bytes' => 4, 'sha256' => hash('sha256', 'test'), 'scan_status' => $scan]);
            ExpertDocument::create(['expert_profile_id' => $f['expert']->id, 'document_id' => $d->id, 'purpose' => 'CV']);

            return $v;
        });
    }

    public static function issue(array $f)
    {
        return app(OfferService::class)->issue($f['admin'], $f['offer']->refresh(), $f['offer']->record_version);
    }

    public static function accept(array $f, $v)
    {
        return app(OfferService::class)->respond($f['user'], $v, ['response_type' => 'ACCEPTED', 'command_id' => (string) Str::uuid()]);
    }
}

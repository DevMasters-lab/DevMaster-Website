<?php

namespace Tests\Feature;

use App\Jobs\DeliverOutboxEvent;
use App\Models\Availability;
use App\Models\CompanyRequest;
use App\Models\Contact;
use App\Models\DocumentVersion;
use App\Models\ExpertProfile;
use App\Models\OfferDocument;
use App\Models\OfferVersion;
use App\Models\Organization;
use App\Models\OutboxEvent;
use App\Models\Placement;
use App\Models\SelectionDecision;
use App\Models\User;
use App\Services\CommandService;
use App\Services\OfferService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\WorkflowFixture as F;
use Tests\TestCase;

class AcceptanceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
        Storage::fake('private');
    }

    private function rejected(callable $action, ?int $status = null): void
    {
        try {
            DB::transaction(fn () => $action());
            $this->fail('Expected rejection.');
        } catch (QueryException $e) {
            $this->assertContains($e->getCode(), ['23514', '23503', '23505', '23P01', '23001']);
        } catch (AuthorizationException $e) {
            $this->assertSame(403, $status ?? 403);
        } catch (HttpException $e) {
            if ($status) {
                $this->assertSame($status, $e->getStatusCode());
            } else {
                $this->assertContains($e->getStatusCode(), [403, 409, 422]);
            }
        }
    }

    public function test_at01_anonymous_intake_is_atomic_and_does_not_create_company_accounts(): void
    {
        $count = User::count();
        $key = (string) Str::uuid();
        $data = ['request_type' => 'HIRE_OUR_TEAM', 'submitted_company_name' => 'Agency', 'submitted_contact_name' => 'Contact', 'submitted_email' => 'contact@example.test', 'title' => 'Hiring expertise', 'requirements' => 'We need specialist software engineering expertise.'];
        $r = $this->postJson('/api/v1/company-requests', $data, ['Idempotency-Key' => $key])->assertCreated()->assertJsonPath('data.message', 'Your request has been received. DevMasters will review it and follow up.');
        $this->assertSame($count, User::count());
        $q = CompanyRequest::where('reference_no', $r->json('data.reference_no'))->firstOrFail();
        $this->assertEquals($data, $q->submission_snapshot['data']);
        $this->assertDatabaseHas('outbox_events', ['aggregate_id' => $q->id, 'event_type' => 'request.received']);
    }

    public function test_at02_application_precedes_account_and_portal_access(): void
    {
        $this->postJson('/api/v1/expert-applications', ['full_name' => 'Applicant', 'contact_email' => 'applicant@example.test', 'professional_title' => 'Engineer', 'biography' => 'A professional application with specialist expertise.', 'consent' => true, 'consent_version' => config('devmasters.consent_version'), 'cv' => UploadedFile::fake()->create('cv.pdf', 2, 'application/pdf')], ['Idempotency-Key' => (string) Str::uuid()])->assertCreated();
        $this->assertNull(ExpertProfile::where('contact_email', 'applicant@example.test')->firstOrFail()->user_id);
        $this->getJson('/api/v1/expert/profile')->assertUnauthorized();
    }

    public function test_at03_database_rejects_contact_from_another_company(): void
    {
        $f = F::make();
        $a = Organization::create(['organization_code' => Str::random(12), 'name' => 'A', 'created_by_user_id' => $f['admin']->id]);
        $b = Organization::create(['organization_code' => Str::random(12), 'name' => 'B', 'created_by_user_id' => $f['admin']->id]);
        $c = Contact::create(['organization_id' => $b->id, 'full_name' => 'B contact', 'email' => 'b@example.test', 'created_by_user_id' => $f['admin']->id]);
        $this->rejected(fn () => $f['request']->update(['organization_id' => $a->id, 'contact_id' => $c->id]));
    }

    public function test_at04_database_rejects_shortlist_identity_mismatch(): void
    {
        $a = F::make();
        $b = F::make($a['admin']);
        $this->rejected(fn () => $a['offer']->update(['candidate_id' => $b['candidate']->id]));
    }

    public function test_at05_database_rejects_current_version_from_another_offer(): void
    {
        $a = F::make();
        $b = F::make($a['admin']);
        $this->rejected(fn () => $a['offer']->update(['current_version_id' => $b['offer']->current_version_id]));
    }

    public function test_at06_issued_terms_and_attachment_membership_are_immutable(): void
    {
        $f = F::make();
        $file = F::file($f);
        $v = F::issue($f);
        foreach (['compensation_amount' => '101.00', 'payer_name_snapshot' => 'Other', 'scope' => 'Changed', 'expires_at' => now()->addDays(2)] as $key => $value) {
            $this->rejected(fn () => DB::table('offer_versions')->where('id', $v->id)->update([$key => $value]));
        }$this->rejected(fn () => OfferDocument::create(['offer_version_id' => $v->id, 'document_version_id' => $file->id]));
    }

    public function test_at07_superseded_version_cannot_be_accepted(): void
    {
        $f = F::make();
        $v = F::issue($f);
        app(OfferService::class)->revise($f['admin'], $f['offer']->refresh(), $f['offer']->record_version, []);
        $this->rejected(fn () => F::accept($f, $v), 409);
    }

    public function test_at08_deadline_blocks_late_acceptance_and_expiry_skips_valid_acceptance(): void
    {
        $f = F::make();
        OfferVersion::findOrFail($f['offer']->current_version_id)->update(['expires_at' => now()->addSeconds(3)]);
        $v = F::issue($f);
        usleep(3300000);
        $this->rejected(fn () => F::accept($f, $v), 409);
        app(OfferService::class)->expire($f['offer']);
        $this->assertSame('EXPIRED', $v->refresh()->status);
        $g = F::make($f['admin']);
        $accepted = F::issue($g);
        F::accept($g, $accepted);
        app(OfferService::class)->expire($g['offer']);
        $this->assertSame('ACCEPTED', $accepted->refresh()->status);
    }

    public function test_at09_duplicate_acceptance_replays_and_conflicting_decision_fails(): void
    {
        $f = F::make();
        $v = F::issue($f);
        $data = ['response_type' => 'ACCEPTED', 'command_id' => (string) Str::uuid()];
        $service = app(OfferService::class);
        $a = $service->respond($f['user'], $v, $data);
        $b = $service->respond($f['user'], $v, $data);
        $this->assertSame($a->id, $b->id);
        $this->assertSame(0, Placement::where('offer_id', $f['offer']->id)->count());
        $this->rejected(fn () => $service->respond($f['user'], $v, ['response_type' => 'DECLINED', 'command_id' => (string) Str::uuid()]), 409);
    }

    public function test_at10_off_portal_acceptance_requires_staff_attribution_and_evidence(): void
    {
        $f = F::make();
        $v = F::issue($f);
        $this->rejected(fn () => app(OfferService::class)->respond($f['admin'], $v, ['response_type' => 'ACCEPTED', 'channel' => 'PHONE', 'command_id' => (string) Str::uuid()]), 422);
        $this->rejected(fn () => app(OfferService::class)->respond($f['user'], $v, ['response_type' => 'ACCEPTED', 'channel' => 'PHONE', 'evidence_summary' => 'Phone confirmation', 'command_id' => (string) Str::uuid()]), 403);
    }

    public function test_at11_selection_requires_current_exact_acceptance(): void
    {
        $f = F::make();
        F::issue($f);
        $this->rejected(fn () => app(OfferService::class)->decide($f['admin'], $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Choose expert']), 409);
    }

    public function test_at13_repeated_selection_returns_one_placement(): void
    {
        $f = F::make();
        $v = F::issue($f);
        F::accept($f, $v);
        $s = app(OfferService::class);
        $a = $s->decide($f['admin'], $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Suitable']);
        $b = $s->decide($f['admin'], $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Suitable']);
        $this->assertSame($a['placement']['id'], $b['placement']['id']);
        $this->assertSame(1, Placement::where('offer_id', $f['offer']->id)->count());
    }

    public function test_at14_email_failure_does_not_reverse_business_state(): void
    {
        $f = F::make();
        $v = F::issue($f);
        $event = OutboxEvent::where('aggregate_id', $v->id)->where('event_type', 'offer.issued')->firstOrFail();
        Notification::shouldReceive('send')->once()->andThrow(new \RuntimeException('Simulated email outage'));
        try {
            (new DeliverOutboxEvent($event->id))->handle();
            $this->fail('Expected provider failure.');
        } catch (\RuntimeException $e) {
            $this->assertSame('Simulated email outage', $e->getMessage());
        }$this->assertSame('ISSUED', $v->refresh()->status);
        $this->assertSame('FAILED', $event->refresh()->status);
        $this->assertDatabaseHas('notifications', ['outbox_event_id' => $event->id]);
    }

    public function test_at15_quarantined_files_cannot_be_downloaded_or_issued(): void
    {
        $f = F::make();
        $file = F::file($f, 'PENDING');
        $this->actingAs($f['user'])->get('/api/v1/expert/document-versions/'.$file->id.'/download', ['Accept' => 'application/json'])->assertForbidden();
        OfferDocument::create(['offer_version_id' => $f['offer']->current_version_id, 'document_version_id' => $file->id]);
        $this->rejected(fn () => F::issue($f), 409);
        $file->update(['scan_status' => 'INFECTED']);
        $this->assertFalse(Gate::forUser($f['user'])->allows('view', $file));
    }

    public function test_at16_known_uuids_do_not_allow_cross_expert_access(): void
    {
        $a = F::make();
        $b = F::make($a['admin']);
        $v = F::issue($b);
        $file = F::file($b);
        $this->actingAs($a['user'])->getJson('/api/v1/expert/offers/'.$b['offer']->id)->assertNotFound();
        $this->postJson('/api/v1/expert/offer-versions/'.$v->id.'/responses', ['response_type' => 'ACCEPTED', 'command_id' => (string) Str::uuid()], ['Idempotency-Key' => (string) Str::uuid()])->assertNotFound();
        $this->getJson('/api/v1/expert/document-versions/'.$file->id.'/download')->assertForbidden();
        $this->getJson('/api/v1/expert/profile')->assertJsonPath('data.id', $a['expert']->id);
        $this->getJson('/api/v1/expert/placements')->assertJsonCount(0, 'data');
    }

    public function test_at17_reversal_appends_and_cancels_without_rewriting_acceptance(): void
    {
        $f = F::make();
        $v = F::issue($f);
        $response = F::accept($f, $v);
        $s = app(OfferService::class);
        $first = $s->decide($f['admin'], $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Selected']);
        $second = $s->decide($f['admin'], $f['offer'], ['decision' => 'NOT_SELECTED', 'reason' => 'Company withdrew the role']);
        $this->assertSame('CANCELLED', $second['placement']['status']);
        $this->assertSame(2, SelectionDecision::where('offer_id', $f['offer']->id)->count());
        $this->assertSame($first['decision']['id'], $second['decision']['supersedes_decision_id']);
        $this->assertSame('ACCEPTED', $response->refresh()->response_type);
    }

    public function test_at18_referenced_master_cannot_be_hard_deleted(): void
    {
        $f = F::make();
        $this->rejected(fn () => $f['user']->delete());
        $this->rejected(fn () => $f['request']->delete());
        $this->rejected(fn () => $f['offer']->delete());
    }

    public function test_at19_submissions_and_issued_document_versions_survive_corrections(): void
    {
        $f = F::make();
        $file = F::file($f);
        OfferDocument::create(['offer_version_id' => $f['offer']->current_version_id, 'document_version_id' => $file->id]);
        $v = F::issue($f);
        $this->rejected(fn () => $f['request']->update(['submitted_company_name' => 'Corrected']));
        $next = DocumentVersion::create($file->only(['document_id', 'original_filename', 'bucket_name', 'mime_type', 'size_bytes', 'sha256']) + ['version_no' => 2, 'object_key' => 'new/'.Str::uuid(), 'scan_status' => 'CLEAN']);
        $this->assertDatabaseHas('offer_documents', ['offer_version_id' => $v->id, 'document_version_id' => $file->id]);
        $this->assertNotSame($file->id, $next->id);
        $this->assertSame(['company' => 'Test Company'], $f['request']->refresh()->submission_snapshot);
    }

    public function test_rbac_requires_separate_selection_permission(): void
    {
        $f = F::make();
        $staff = User::factory()->create();
        $staff->assignRole('STAFF');
        $v = F::issue($f);
        F::accept($f, $v);
        $this->rejected(fn () => app(OfferService::class)->decide($staff, $f['offer'], ['decision' => 'SELECTED', 'reason' => 'Test']), 403);
    }

    public function test_idempotency_replays_same_result_and_rejects_changed_payload(): void
    {
        $s = app(CommandService::class);
        $key = (string) Str::uuid();
        $a = $s->run('user:test', $key, 'test', ['a' => 1], fn () => ['id' => 'one']);
        $b = $s->run('user:test', $key, 'test', ['a' => 1], fn () => ['id' => 'two']);
        $this->assertSame($a, $b);
        $this->rejected(fn () => $s->run('user:test', $key, 'test', ['a' => 2], fn () => []), 409);
    }

    public function test_postgresql_rejects_overlapping_availability(): void
    {
        $f = F::make();
        Availability::create(['expert_profile_id' => $f['expert']->id, 'starts_on' => '2026-11-01', 'ends_on' => '2026-11-30', 'status' => 'AVAILABLE']);
        $this->rejected(fn () => Availability::create(['expert_profile_id' => $f['expert']->id, 'starts_on' => '2026-11-30', 'status' => 'LIMITED']));
    }
}

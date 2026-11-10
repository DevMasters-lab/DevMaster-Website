<?php

namespace Tests\Feature;

use App\Models\ExpertProfile;
use App\Services\ApplicationCorrectionService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApplicationCorrectionsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_scoped_corrections_preserve_original_and_require_fresh_review(): void
    {
        $p = ExpertProfile::create(['expert_code' => 'TEST-'.Str::random(12), 'full_name' => 'Original applicant', 'contact_email' => 'corrections@example.test', 'application_status' => 'CORRECTIONS_REQUIRED', 'application_snapshot' => ['full_name' => 'Original applicant']]);
        $service = app(ApplicationCorrectionService::class);
        $token = basename($service->link($p));
        $this->getJson('/api/v1/application-corrections/'.$token)->assertOk()->assertJsonPath('data.full_name', 'Original applicant');
        $this->postJson('/api/v1/application-corrections/'.$token, ['full_name' => 'Updated applicant', 'professional_title' => 'Engineer', 'biography' => 'An updated professional biography for review.'])->assertOk();
        $this->assertSame('SUBMITTED', $p->refresh()->application_status);
        $this->assertSame(['full_name' => 'Original applicant'], $p->application_snapshot);
        $this->getJson('/api/v1/application-corrections/'.$token)->assertNotFound();
        $this->assertNull($p->user_id);
    }

    public function test_random_or_expired_correction_tokens_do_not_expose_applications(): void
    {
        $this->getJson('/api/v1/application-corrections/'.Str::random(64))->assertNotFound();
    }
}

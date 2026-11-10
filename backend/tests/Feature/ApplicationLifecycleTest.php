<?php

namespace Tests\Feature;

use App\Models\DocumentVersion;
use App\Models\ExpertDocument;
use App\Models\ExpertProfile;
use App\Models\User;
use App\Services\ExpertApplicationService;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Livewire\Livewire;
use Tests\Support\WorkflowFixture as F;
use Tests\TestCase;

class ApplicationLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    public function test_application_review_invitation_and_mail_token_activation_enable_own_portal(): void
    {
        $this->seed();
        Storage::fake('private');
        $admin = User::factory()->create();
        $admin->assignRole('ADMIN');
        $this->postJson('/api/v1/expert-applications', ['full_name' => 'Lifecycle Applicant', 'contact_email' => 'lifecycle@example.test', 'professional_title' => 'Engineer', 'biography' => 'A detailed professional biography for review.', 'consent' => true, 'consent_version' => config('devmasters.consent_version'), 'cv' => UploadedFile::fake()->create('cv.pdf', 1, 'application/pdf')], ['Idempotency-Key' => (string) Str::uuid()])->assertCreated();
        $p = ExpertProfile::where('contact_email', 'lifecycle@example.test')->firstOrFail();
        $file = DocumentVersion::whereIn('document_id', ExpertDocument::where('expert_profile_id', $p->id)->select('document_id'))->firstOrFail();
        $file->update(['scan_status' => 'CLEAN']);
        $service = app(ExpertApplicationService::class);
        $review = $service->review($admin, $p, ['decision' => 'APPROVED']);
        $this->assertSame($file->id, $review->reviewed_document_refs[0]['id']);
        $user = $service->invite($admin, $p->refresh());
        $this->assertSame('INVITED', $user->status);
        $this->assertFalse($user->isEligibleExpert());
        $token = Password::createToken($user);
        $this->postJson('/api/v1/auth/reset-password', ['email' => $user->email, 'token' => $token, 'password' => 'New-test-password-123!', 'password_confirmation' => 'New-test-password-123!'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'New-test-password-123!'])->assertOk();
        $this->getJson('/api/v1/expert/profile')->assertJsonPath('data.id', $p->id);
    }

    public function test_contextual_record_pages_render_their_relation_managers(): void
    {
        $this->seed();
        $f = F::make();
        $this->actingAs($f['admin']);
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        foreach (['CompanyRequest' => $f['request'], 'ExpertProfile' => $f['expert'], 'ExpertOffer' => $f['offer']] as $model => $record) {
            Livewire::test('App\\Filament\\Resources\\'.$model.'Resource\\ViewRecord', ['record' => $record->id])->assertSuccessful();
        }
    }
}

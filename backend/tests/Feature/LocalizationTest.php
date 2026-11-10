<?php

namespace Tests\Feature;

use App\Filament\Resources\CompanyRequestResource;
use App\Jobs\DeliverOutboxEvent;
use App\Models\NotificationTemplate;
use App\Models\OutboxEvent;
use App\Models\PublicPage;
use App\Models\Service;
use App\Models\User;
use App\Notifications\BusinessNotification;
use App\Services\BusinessEvents;
use Filament\Facades\Filament;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Livewire\Livewire;
use Tests\Support\WorkflowFixture;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_khmer_default_and_supported_header_and_cookie_resolution(): void
    {
        $this->app->make(Kernel::class)->bootstrap();
        app()->setLocale('km');
        $this->withHeader('Accept-Language', '')->getJson('/api/v1/locale')->assertOk()->assertJsonPath('data.locale', 'km')->assertHeader('Content-Language', 'km');
        $this->withCredentials()->withUnencryptedCookie('devmasters_locale', 'en')->getJson('/api/v1/locale')->assertJsonPath('data.locale', 'en');
        $this->withHeader('X-Locale', 'km')->getJson('/api/v1/locale')->assertJsonPath('data.locale', 'km');
    }

    public function test_locale_preference_is_saved_for_authenticated_users_and_invalid_locales_are_rejected(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        $this->postJson('/api/v1/locale', ['locale' => 'km'])->assertOk()->assertCookie('devmasters_locale', 'km', false);
        $this->assertSame('km', $user->fresh()->preferred_locale);
        $this->postJson('/api/v1/locale', ['locale' => 'fr'])->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_FAILED');
        $this->assertSame('km', $user->fresh()->preferred_locale);
    }

    public function test_api_errors_have_stable_codes_and_translated_messages_and_field_keys(): void
    {
        $en = $this->withHeader('X-Locale', 'en')->postJson('/api/v1/company-requests', [])->assertUnprocessable()->assertJsonValidationErrors(['submitted_company_name'])->assertJsonPath('code', 'VALIDATION_FAILED');
        $km = $this->withHeader('X-Locale', 'km')->postJson('/api/v1/company-requests', [])->assertUnprocessable()->assertJsonValidationErrors(['submitted_company_name'])->assertJsonPath('code', 'VALIDATION_FAILED');
        $this->assertNotSame($en->json('errors.submitted_company_name.0'), $km->json('errors.submitted_company_name.0'));
        $this->assertSame('សូមបំពេញព័ត៌មាននេះ។', $km->json('errors.submitted_company_name.0'));
        $this->withHeader('X-Locale', 'km')->getJson('/api/v1/auth/me')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED')->assertJsonPath('message', 'សូមចូលគណនីជាមុន។');
    }

    public function test_password_reset_codes_stay_stable_and_missing_pages_do_not_leak_model_details(): void
    {
        $user = User::factory()->create();
        $input = ['email' => $user->email, 'token' => 'invalid-token', 'password' => 'Test-password-123!', 'password_confirmation' => 'Test-password-123!'];
        $english = $this->withHeader('X-Locale', 'en')->postJson('/api/v1/auth/reset-password', $input)->assertUnprocessable();
        $khmer = $this->withHeader('X-Locale', 'km')->postJson('/api/v1/auth/reset-password', $input)->assertUnprocessable();
        $this->assertSame($english->json('code'), $khmer->json('code'));
        $this->assertNotSame($english->json('message'), $khmer->json('message'));
        $this->getJson('/api/v1/pages/missing-localized-page')->assertNotFound()->assertJsonPath('code', 'NOT_FOUND')->assertJsonPath('message', __('Not found.'));
    }

    public function test_postgresql_rejects_unsupported_saved_locales_and_translation_maps(): void
    {
        $user = User::factory()->create();
        $service = Service::create(['code' => 'I18N_'.Str::random(10), 'name' => 'Preserved service']);
        foreach ([fn () => $user->update(['preferred_locale' => 'fr']), fn () => $service->update(['translations' => ['fr' => ['name' => 'Invalid locale']]])] as $attempt) {
            try {
                DB::transaction($attempt);
                $this->fail('The database must reject unsupported locales.');
            } catch (QueryException $exception) {
                $this->assertSame('23514', $exception->errorInfo[0]);
            }
        }
        $this->assertNull($user->fresh()->preferred_locale);
        $this->assertSame('Preserved service', $service->fresh()->name);
    }

    public function test_catalogue_and_cms_content_use_explicit_translations_with_english_fallback(): void
    {
        $service = Service::create(['code' => 'I18N_'.Str::random(10), 'name' => 'Original service', 'description' => 'Original details', 'translations' => ['km' => ['name' => 'សេវាខ្មែរ']]]);
        $this->withHeader('X-Locale', 'km')->getJson('/api/v1/reference-data')->assertOk()->assertJsonFragment(['id' => $service->id, 'code' => $service->code, 'name' => 'សេវាខ្មែរ', 'description' => 'Original details']);
        $this->assertSame('Original service', $service->fresh()->name);
        $editor = User::factory()->create();
        $slug = 'locale-'.Str::lower(Str::random(10));
        PublicPage::create(['slug' => $slug, 'locale' => 'en', 'title' => 'Original title', 'body_markdown' => 'Original body', 'status' => 'PUBLISHED', 'published_at' => now(), 'updated_by_user_id' => $editor->id]);
        $this->getJson('/api/v1/pages/'.$slug)->assertJsonPath('data.locale', 'en')->assertJsonPath('data.title', 'Original title');
        PublicPage::create(['slug' => $slug, 'locale' => 'km', 'title' => 'ចំណងជើងខ្មែរ', 'body_markdown' => 'ខ្លឹមសារខ្មែរ', 'status' => 'PUBLISHED', 'published_at' => now(), 'updated_by_user_id' => $editor->id]);
        $this->getJson('/api/v1/pages/'.$slug)->assertJsonPath('data.locale', 'km')->assertJsonPath('data.title', 'ចំណងជើងខ្មែរ');
    }

    public function test_expert_login_returns_saved_preference_without_changing_workflow_codes(): void
    {
        $this->seed();
        $fixture = WorkflowFixture::make();
        $fixture['user']->update(['preferred_locale' => 'km']);
        $this->withHeader('X-Locale', 'en')->postJson('/api/v1/auth/login', ['email' => $fixture['user']->email, 'password' => 'Test-only-password-123!'])->assertOk()->assertJsonPath('data.preferred_locale', 'km');
        $this->assertSame('APPROVED', $fixture['expert']->fresh()->application_status);
        $this->assertSame('DRAFT', $fixture['offer']->fresh()->status);
    }

    public function test_queued_notifications_and_templates_use_recipient_locale_and_restore_worker_locale(): void
    {
        Notification::fake();
        $recipient = User::factory()->create(['preferred_locale' => 'km']);
        NotificationTemplate::create(['template_key' => 'offer.issued', 'channel' => 'EMAIL', 'locale' => 'km', 'version_no' => 1, 'subject' => 'សំណើថ្មី', 'body' => 'លេខយោង {{reference_no}}', 'variables_schema' => ['allowed' => []], 'is_active' => true, 'created_by_user_id' => $recipient->id, 'published_at' => now()]);
        $event = app(BusinessEvents::class)->record('offer.issued', 'offer_version', (string) Str::uuid(), null, recipient: $recipient, data: ['reference_no' => 'I18N-REF', 'message' => 'An offer is ready for your review.']);
        app()->setLocale('en');
        (new DeliverOutboxEvent($event->id))->handle();
        $this->assertSame('en', app()->getLocale());
        $this->assertSame('PUBLISHED', $event->fresh()->status);
        Notification::assertSentOnDemand(BusinessNotification::class, function ($notification) {
            return $notification->locale === 'km' && $notification->title === 'សំណើថ្មី' && str_contains($notification->message, 'I18N-REF');
        });
        $recipient->update(['preferred_locale' => 'en']);
        $second = app(BusinessEvents::class)->record('offer.issued', 'offer_version', (string) Str::uuid(), null, recipient: $recipient, data: ['message' => 'An offer is ready for your review.']);
        (new DeliverOutboxEvent($second->id))->handle();
        Notification::assertSentOnDemand(BusinessNotification::class, fn ($notification) => $notification->locale === 'en' && $notification->message === 'An offer is ready for your review.');
        $this->assertSame('en', app()->getLocale());
    }

    public function test_anonymous_submission_captures_locale_and_localizes_acknowledgement(): void
    {
        $response = $this->withHeaders(['X-Locale' => 'km', 'Idempotency-Key' => (string) Str::uuid()])->postJson('/api/v1/company-requests', ['request_type' => 'HIRE_OUR_TEAM', 'submitted_company_name' => 'Original company', 'submitted_contact_name' => 'Original contact', 'submitted_email' => 'localization@example.test', 'title' => 'Original request', 'requirements' => 'A sufficiently detailed original request for testing.'])->assertCreated()->assertJsonPath('data.message_code', 'REQUEST_RECEIVED');
        $this->assertStringContainsString('ជោគជ័យ', $response->json('data.message'));
        $event = OutboxEvent::where('event_type', 'request.received')->where('payload->data->reference_no', $response->json('data.reference_no'))->firstOrFail();
        $this->assertSame('km', $event->payload['locale']);
        $this->assertDatabaseHas('company_requests', ['reference_no' => $response->json('data.reference_no'), 'status' => 'SUBMITTED', 'submitted_company_name' => 'Original company']);
    }

    public function test_all_filament_resource_tables_render_in_khmer(): void
    {
        $this->seed();
        $admin = User::factory()->create(['preferred_locale' => 'km']);
        $admin->assignRole('ADMIN');
        $this->actingAs($admin, 'web');
        app()->setLocale('km');
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        foreach (glob(app_path('Filament/Resources/*/ManageRecords.php')) as $file) {
            $resource = basename(dirname($file));
            Livewire::test('App\\Filament\\Resources\\'.$resource.'\\ManageRecords')->assertSuccessful();
        }
        $this->assertSame('សំណើក្រុមហ៊ុន', CompanyRequestResource::getPluralModelLabel());
    }
}

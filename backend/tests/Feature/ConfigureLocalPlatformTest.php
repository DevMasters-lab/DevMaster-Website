<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ConfigureLocalPlatformTest extends TestCase
{
    use DatabaseTransactions;

    public function test_local_catalogue_is_available_through_the_api_and_preserves_administrator_edits(): void
    {
        $this->seed();
        $this->app['env'] = 'local';
        $administrator = User::factory()->create();
        $administrator->assignRole('ADMIN');
        $this->artisan('devmasters:configure-local', ['administrator-email' => $administrator->email])->assertSuccessful();
        $service = Service::where('code', 'CYBERSECURITY')->firstOrFail();
        $skill = Skill::where('code', 'CYBERSECURITY')->firstOrFail();
        $this->getJson('/api/v1/reference-data')->assertOk()->assertJsonFragment(['id' => $skill->id, 'code' => 'CYBERSECURITY', 'name' => 'Cybersecurity']);
        $service->update(['name' => 'Security advisory', 'is_active' => false]);
        $skill->update(['name' => 'Security specialist', 'is_active' => false]);
        $services = Service::count();
        $skills = Skill::count();
        $this->artisan('devmasters:configure-local', ['administrator-email' => $administrator->email])->assertSuccessful();
        $this->assertSame($services, Service::count());
        $this->assertSame($skills, Skill::count());
        $this->assertSame('Security advisory', $service->fresh()->name);
        $this->assertFalse($service->fresh()->is_active);
        $this->assertSame('Security specialist', $skill->fresh()->name);
        $this->assertFalse($skill->fresh()->is_active);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $administrator->id, 'action' => 'local.configuration-initialized', 'actor_user_id' => $administrator->id]);
    }

    public function test_staff_accounts_cannot_initialize_local_configuration(): void
    {
        $this->seed();
        $this->app['env'] = 'local';
        $staff = User::factory()->create();
        $staff->assignRole('STAFF');
        $count = Service::count();
        $this->artisan('devmasters:configure-local', ['administrator-email' => $staff->email])->assertFailed();
        $this->assertSame($count, Service::count());
    }

    public function test_configuration_is_unavailable_outside_local_environment(): void
    {
        $count = Service::count();
        $this->artisan('devmasters:configure-local', ['administrator-email' => 'unused@example.test'])->assertFailed();
        $this->assertSame($count, Service::count());
    }
}

<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class LocalSetupTest extends TestCase
{
    use DatabaseTransactions;

    public function test_local_setup_is_hidden_outside_local_environment(): void
    {
        $this->get(URL::temporarySignedRoute('local.setup', now()->addMinutes(10)))->assertNotFound();
    }

    public function test_local_setup_requires_a_valid_signature(): void
    {
        $this->app['env'] = 'local';
        $this->get('/admin/setup')->assertForbidden();
    }

    public function test_signed_local_setup_creates_only_one_administrator_and_keeps_mfa_required(): void
    {
        $this->seed();
        // Model a fresh installation inside this test's rolled-back transaction.
        DB::table('user_roles')->where('role_id', Role::where('code', 'ADMIN')->value('id'))->delete();
        $this->app['env'] = 'local';
        $url = URL::temporarySignedRoute('local.setup', now()->addMinutes(10));
        $this->get($url)->assertOk()->assertSee('Create your local administrator');
        $this->withSession(['_token' => 'local-setup-test'])->post($url, ['_token' => 'local-setup-test', 'display_name' => 'Local owner', 'email' => 'owner@example.test', 'password' => 'Local-test-password-123!', 'password_confirmation' => 'Local-test-password-123!'])->assertRedirect('/admin/login');

        $owner = User::where('email', 'owner@example.test')->firstOrFail();
        $this->assertTrue($owner->hasRole('ADMIN'));
        $this->assertNull($owner->app_authentication_secret);
        $this->assertDatabaseHas('audit_events', ['entity_id' => $owner->id, 'action' => 'administrator.bootstrapped', 'actor_type' => 'SYSTEM']);
        $this->get($url)->assertConflict();
    }
}

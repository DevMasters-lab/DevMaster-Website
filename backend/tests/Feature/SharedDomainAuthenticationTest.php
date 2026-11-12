<?php

namespace Tests\Feature;

use App\Filament\Pages\Security;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Actions\Testing\TestAction;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\Auth\Pages\Login;
use Filament\Facades\Filament;
use Filament\Pages\Dashboard;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Testing\TestResponse;
use Livewire\Livewire;
use Tests\TestCase;

class SharedDomainAuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        config(['app.url' => 'https://devmasters.dev', 'devmasters.frontend_url' => 'https://devmasters.dev']);
        TrustProxies::at('127.0.0.1');
    }

    public function test_guests_see_the_native_login_form_at_admin_and_the_old_login_url_redirects(): void
    {
        $page = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertOk()->assertHeaderMissing('Location')
            ->assertSee('data.email', false)->assertSee('data.password', false)->assertSee('data.remember', false)
            ->assertSee('admin-language-control', false)
            ->assertSee('https://devmasters.dev/admin/password-reset/request', false);
        $snapshot = json_decode($this->snapshot($page), true);
        $this->assertInstanceOf(Login::class, Livewire::new($snapshot['memo']['name']));
        $this->assertSame('admin/login', $snapshot['memo']['path']);

        $this->get('http://devmasters-api.onrender.com/admin/login', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin');
    }

    public function test_admin_password_mfa_login_and_logout_keep_the_public_origin_and_end_the_session(): void
    {
        $provider = AppAuthentication::make();
        $admin = User::factory()->create(['app_authentication_secret' => $provider->generateSecret()]);
        $admin->assignRole('ADMIN');
        $page = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())->assertOk();
        $challenge = $this->authenticate($this->snapshot($page), [
            'data.email' => $admin->email,
            'data.password' => 'Test-only-password-123!',
            'data.remember' => true,
        ])->assertOk();
        $this->assertGuest('web');
        $challengeSnapshot = $challenge->json('components.0.snapshot');
        $this->assertNotNull(json_decode($challengeSnapshot, true)['data']['userUndertakingMultiFactorAuthentication']);

        $invalidChallenge = $this->authenticate($challengeSnapshot, ['data.multiFactor.app.code' => '12345'])->assertOk();
        $this->assertGuest('web');
        $invalidSnapshot = $invalidChallenge->json('components.0.snapshot');
        $this->assertNotEmpty(json_decode($invalidSnapshot, true)['memo']['errors']['data.multiFactor.app.code']);

        $this->authenticate($invalidSnapshot, ['data.multiFactor.app.code' => $provider->getCurrentCode($admin)])
            ->assertOk()->assertJsonPath('components.0.effects.redirect', 'https://devmasters.dev/admin')
            ->assertCookie(auth('web')->getRecallerName())
            ->assertHeader('CDN-Cache-Control', 'no-store');
        $this->assertAuthenticatedAs($admin, 'web');
        $this->get('http://devmasters-api.onrender.com/admin/login', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin');

        $dashboard = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertOk()->assertHeaderMissing('Location');
        $dashboardSnapshot = $this->snapshot($dashboard, Dashboard::class);
        $dashboardMemo = json_decode($dashboardSnapshot, true)['memo'];
        $this->assertInstanceOf(Dashboard::class, Livewire::new($dashboardMemo['name']));
        $this->assertSame('admin', $dashboardMemo['path']);

        $this->post('http://devmasters-api.onrender.com/admin/logout', [], $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin/login')
            ->assertHeader('CDN-Cache-Control', 'no-store');
        $this->assertGuest('web');
        $this->get('http://devmasters-api.onrender.com/admin/login', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin');
        $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertOk()->assertHeaderMissing('Location')->assertSee('data.password', false);

        $this->postJson('http://devmasters-api.onrender.com/livewire/update', [
            'components' => [[
                'snapshot' => $dashboardSnapshot,
                'updates' => [],
                'calls' => [],
            ]],
        ], [...$this->forwardedHeaders(), 'X-Livewire' => 'true'])->assertUnauthorized();
    }

    public function test_admin_without_an_authenticator_can_sign_in_and_open_the_dashboard_without_forced_setup(): void
    {
        $admin = User::factory()->create(['app_authentication_secret' => null]);
        $admin->assignRole('ADMIN');
        $page = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())->assertOk();

        $this->authenticate($this->snapshot($page), [
            'data.email' => $admin->email,
            'data.password' => 'Test-only-password-123!',
        ])->assertOk()->assertJsonPath('components.0.effects.redirect', 'https://devmasters.dev/admin');

        $this->assertAuthenticatedAs($admin, 'web');
        $dashboard = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertOk()->assertHeaderMissing('Location');
        $this->snapshot($dashboard, Dashboard::class);
        $this->assertNull($admin->fresh()->app_authentication_secret);
    }

    public function test_security_settings_require_admin_authentication_and_offer_optional_authenticator_setup(): void
    {
        $this->get('http://devmasters-api.onrender.com/admin/settings/security', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin/login');

        $admin = User::factory()->create(['app_authentication_secret' => null]);
        $admin->assignRole('ADMIN');
        $this->actingAs($admin, 'web')
            ->get('http://devmasters-api.onrender.com/admin/settings/security', $this->forwardedHeaders())
            ->assertOk()->assertHeaderMissing('Location')
            ->assertSee('Authenticator app')->assertSee('Set up');
        $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertOk()->assertSee('https://devmasters.dev/admin/settings/security', false);
        $this->get('http://devmasters-api.onrender.com/admin/multi-factor-authentication/set-up', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin/settings/security');

        $user = User::factory()->create();
        $this->actingAs($user, 'web')
            ->get('http://devmasters-api.onrender.com/admin/settings/security', $this->forwardedHeaders())
            ->assertForbidden();
    }

    public function test_admin_can_opt_in_to_app_authentication_from_security_settings(): void
    {
        $admin = User::factory()->create(['app_authentication_secret' => null]);
        $admin->assignRole('ADMIN');
        $this->actingAs($admin, 'web');
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        $provider = AppAuthentication::make();
        $component = Livewire::test(Security::class)
            ->mountAction(TestAction::make('setUpAppAuthentication')->schemaComponent(true, 'content'));
        $arguments = decrypt($component->instance()->getMountedAction()->getArguments()['encrypted']);

        $component->setActionData([
            'password' => 'Test-only-password-123!',
            'code' => $provider->getCurrentCode($admin, $arguments['secret']),
        ])->callMountedAction()->assertHasNoActionErrors();

        $this->assertTrue($provider->isEnabled($admin->fresh()));
    }

    public function test_disabling_app_authentication_requires_the_current_password_and_valid_authenticator_code(): void
    {
        $provider = AppAuthentication::make();
        $admin = User::factory()->create(['app_authentication_secret' => $provider->generateSecret()]);
        $admin->assignRole('ADMIN');
        $this->actingAs($admin, 'web');
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        Filament::bootCurrentPanel();
        $action = TestAction::make('disableAppAuthentication')->schemaComponent(true, 'content');
        $component = Livewire::test(Security::class);

        $component->callAction($action, ['password' => 'wrong-test-password', 'code' => '12345'])
            ->assertHasActionErrors(['password']);
        $this->assertTrue($provider->isEnabled($admin->fresh()));
        $component->unmountAction();
        $component->callAction($action, ['password' => 'Test-only-password-123!', 'code' => '12345'])
            ->assertHasActionErrors(['code']);
        $this->assertTrue($provider->isEnabled($admin->fresh()));
        $component->unmountAction();
        $component->callAction($action, [
            'password' => 'Test-only-password-123!',
            'code' => $provider->getCurrentCode($admin),
        ])->assertHasNoActionErrors();

        $this->assertNull($admin->fresh()->app_authentication_secret);
    }

    public function test_incorrect_credentials_keep_the_user_logged_out_and_show_native_validation(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('ADMIN');
        $page = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())->assertOk();
        $failure = $this->authenticate($this->snapshot($page), [
            'data.email' => $admin->email,
            'data.password' => 'incorrect-test-password',
        ])->assertOk();
        $this->assertGuest('web');
        $snapshot = json_decode($failure->json('components.0.snapshot'), true);
        $this->assertNotEmpty($snapshot['memo']['errors']['data.email']);
        $this->assertNull($failure->json('components.0.effects.redirect'));
    }

    public function test_an_account_without_admin_permission_cannot_login_or_open_the_dashboard(): void
    {
        $user = User::factory()->create();
        $page = $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())->assertOk();
        $failure = $this->authenticate($this->snapshot($page), [
            'data.email' => $user->email,
            'data.password' => 'Test-only-password-123!',
        ])->assertOk();
        $this->assertGuest('web');
        $snapshot = json_decode($failure->json('components.0.snapshot'), true);
        $this->assertNotEmpty($snapshot['memo']['errors']['data.email']);
        $this->assertNull($snapshot['data']['userUndertakingMultiFactorAuthentication']);

        $this->actingAs($user, 'web')
            ->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())->assertForbidden();
    }

    /** @param class-string $componentClass */
    private function snapshot(TestResponse $response, string $componentClass = Login::class): string
    {
        preg_match_all('/wire:snapshot="([^"]+)"/', $response->getContent(), $matches);

        foreach ($matches[1] as $encodedSnapshot) {
            $snapshot = html_entity_decode($encodedSnapshot, ENT_QUOTES);
            $memo = json_decode($snapshot, true)['memo'];

            if (Livewire::new($memo['name']) instanceof $componentClass) {
                return $snapshot;
            }
        }

        $this->fail('The response did not render the expected Livewire component.');
    }

    /** @param array<string, mixed> $updates */
    private function authenticate(string $snapshot, array $updates): TestResponse
    {
        return $this->postJson('http://devmasters-api.onrender.com/livewire/update', [
            'components' => [[
                'snapshot' => $snapshot,
                'updates' => $updates,
                'calls' => [['path' => '', 'method' => 'authenticate', 'params' => []]],
            ]],
        ], [...$this->forwardedHeaders(), 'X-Livewire' => 'true']);
    }

    /** @return array<string, string> */
    private function forwardedHeaders(): array
    {
        return ['X-Forwarded-Host' => 'devmasters.dev', 'X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '443'];
    }
}

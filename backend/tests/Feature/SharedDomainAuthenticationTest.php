<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Auth\MultiFactor\App\AppAuthentication;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Middleware\TrustProxies;
use Tests\TestCase;

class SharedDomainAuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    public function test_admin_password_mfa_login_and_logout_keep_the_public_origin_and_end_the_session(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);
        config(['app.url' => 'https://devmasters.dev', 'devmasters.frontend_url' => 'https://devmasters.dev']);
        TrustProxies::at('127.0.0.1');
        $provider = AppAuthentication::make();
        $admin = User::factory()->create(['app_authentication_secret' => $provider->generateSecret()]);
        $admin->assignRole('ADMIN');
        $headers = ['X-Forwarded-Host' => 'devmasters.dev', 'X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '443'];

        $page = $this->get('http://devmasters-api.onrender.com/admin/login', $headers)->assertOk();
        preg_match('/wire:snapshot="([^"]+)"/', $page->getContent(), $matches);
        $snapshot = html_entity_decode($matches[1], ENT_QUOTES);

        $challenge = $this->postJson('http://devmasters-api.onrender.com/livewire/update', [
            'components' => [[
                'snapshot' => $snapshot,
                'updates' => ['data.email' => $admin->email, 'data.password' => 'Test-only-password-123!'],
                'calls' => [['path' => '', 'method' => 'authenticate', 'params' => []]],
            ]],
        ], [...$headers, 'X-Livewire' => 'true'])->assertOk();
        $this->assertGuest('web');
        $challengeSnapshot = $challenge->json('components.0.snapshot');
        $this->assertNotNull(json_decode($challengeSnapshot, true)['data']['userUndertakingMultiFactorAuthentication']);

        $this->postJson('http://devmasters-api.onrender.com/livewire/update', [
            'components' => [[
                'snapshot' => $challengeSnapshot,
                'updates' => ['data.multiFactor.app.code' => $provider->getCurrentCode($admin)],
                'calls' => [['path' => '', 'method' => 'authenticate', 'params' => []]],
            ]],
        ], [...$headers, 'X-Livewire' => 'true'])
            ->assertOk()->assertJsonPath('components.0.effects.redirect', 'https://devmasters.dev/admin')
            ->assertHeader('CDN-Cache-Control', 'no-store');
        $this->assertAuthenticatedAs($admin, 'web');

        $this->post('http://devmasters-api.onrender.com/admin/logout', [], $headers)
            ->assertRedirect('https://devmasters.dev/admin/login')
            ->assertHeader('CDN-Cache-Control', 'no-store');
        $this->assertGuest('web');
        $this->get('http://devmasters-api.onrender.com/admin', $headers)
            ->assertRedirect('https://devmasters.dev/admin/login');
    }
}

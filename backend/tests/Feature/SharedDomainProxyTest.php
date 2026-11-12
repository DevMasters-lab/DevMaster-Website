<?php

namespace Tests\Feature;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Livewire\Features\SupportFileUploads\GenerateSignedUploadUrl;
use Tests\TestCase;

class SharedDomainProxyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.url' => 'https://devmasters.dev',
            'app.debug' => false,
            'devmasters.frontend_url' => 'https://devmasters.dev',
            'session.driver' => 'array',
            'session.domain' => null,
            'session.secure' => true,
            'session.same_site' => 'lax',
        ]);
        TrustProxies::at('127.0.0.1');
        DB::shouldReceive('connection')->never();
    }

    public function test_forwarded_admin_redirect_stays_on_the_public_https_domain(): void
    {
        $this->get('http://devmasters-api.onrender.com/admin', $this->forwardedHeaders())
            ->assertRedirect('https://devmasters.dev/admin/login')
            ->assertHeader('CDN-Cache-Control', 'no-store');
    }

    public function test_direct_render_admin_redirects_to_the_equivalent_public_path(): void
    {
        $this->get('https://devmasters-api.onrender.com/admin')
            ->assertRedirect('https://devmasters.dev/admin');
    }

    public function test_proxy_markers_recover_the_public_origin_when_upstream_replaces_forwarded_host(): void
    {
        $response = $this->get('http://devmasters-api.onrender.com/admin/login', [
            'X-Forwarded-Host' => 'devmasters-api.onrender.com',
            'X-Forwarded-Proto' => 'http',
            'X-Forwarded-Port' => '10000',
            'X-Devmasters-Proxy-Host' => 'devmasters.dev',
            'X-Devmasters-Proxy-Proto' => 'https',
        ])->assertOk()->assertSee('/fonts/devmasters.css', false)
            ->assertSee('https://devmasters.dev/css/filament/', false);

        $this->assertStringNotContainsString('http://devmasters-api.onrender.com', $response->getContent());
    }

    public function test_unknown_forwarded_hosts_and_markers_cannot_poison_redirects(): void
    {
        $this->get('https://devmasters-api.onrender.com/admin', [
            'X-Forwarded-Host' => 'attacker.example',
            'X-Devmasters-Proxy-Host' => 'attacker.example',
            'X-Devmasters-Proxy-Proto' => 'https',
        ])->assertRedirect('https://devmasters.dev/admin');
    }

    public function test_markers_and_forwarded_headers_are_ignored_from_untrusted_clients(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->get('https://devmasters-api.onrender.com/admin', [
                ...$this->forwardedHeaders(),
                'X-Devmasters-Proxy-Host' => 'devmasters.dev',
                'X-Devmasters-Proxy-Proto' => 'https',
            ])->assertRedirect('https://devmasters.dev/admin');
    }

    public function test_csrf_and_session_cookies_are_secure_host_only_and_not_cached(): void
    {
        $response = $this->get('http://devmasters-api.onrender.com/sanctum/csrf-cookie', $this->forwardedHeaders())
            ->assertNoContent()->assertCookie('XSRF-TOKEN')->assertCookie(config('session.cookie'));

        foreach (['XSRF-TOKEN', config('session.cookie')] as $name) {
            $cookie = $response->getCookie($name, false);
            $this->assertTrue($cookie->isSecure());
            $this->assertNull($cookie->getDomain());
            $this->assertSame('/', $cookie->getPath());
            $this->assertSame('lax', $cookie->getSameSite());
        }

        $this->assertTrue($response->getCookie(config('session.cookie'), false)->isHttpOnly());
        $this->assertFalse($response->getCookie('XSRF-TOKEN', false)->isHttpOnly());
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_livewire_signed_upload_url_uses_public_origin_and_valid_relative_signature(): void
    {
        Route::get('/api/proxy-upload-test', fn () => ['url' => app(GenerateSignedUploadUrl::class)->forLocal()]);

        $url = $this->get('http://devmasters-api.onrender.com/api/proxy-upload-test', $this->forwardedHeaders())
            ->assertOk()->json('url');

        $this->assertStringStartsWith('https://devmasters.dev/livewire-', $url);
        $this->assertTrue(Request::create($url)->hasValidRelativeSignature());
    }

    public function test_livewire_updates_accept_valid_csrf_and_reject_missing_csrf_without_cache(): void
    {
        $this->app['env'] = 'production';

        $page = $this->withSession(['_token' => 'proxy-test-csrf-token'])
            ->get('http://devmasters-api.onrender.com/admin/login', $this->forwardedHeaders())->assertOk();
        preg_match('/wire:snapshot="([^"]+)"/', $page->getContent(), $matches);
        $snapshot = html_entity_decode($matches[1], ENT_QUOTES);

        $this->withSession(['_token' => 'proxy-test-csrf-token'])
            ->postJson('http://devmasters-api.onrender.com/livewire/update', [
                '_token' => 'proxy-test-csrf-token',
                'components' => [['snapshot' => $snapshot, 'updates' => [], 'calls' => []]],
            ], [...$this->forwardedHeaders(), 'X-Livewire' => 'true'])
            ->assertOk()->assertJsonCount(1, 'components')
            ->assertHeader('CDN-Cache-Control', 'no-store');

        $this->postJson('http://devmasters-api.onrender.com/livewire/update', ['components' => []], [
            ...$this->forwardedHeaders(), 'X-Livewire' => 'true',
        ])->assertStatus(419)->assertHeader('CDN-Cache-Control', 'no-store');
    }

    public function test_unauthenticated_api_without_json_accept_header_returns_401_and_is_not_cached(): void
    {
        $this->get('http://devmasters-api.onrender.com/api/v1/auth/me', $this->forwardedHeaders())
            ->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertHeader('CDN-Cache-Control', 'no-store');
    }

    public function test_sensitive_missing_routes_are_not_cached(): void
    {
        foreach (['admin/missing-page', 'filament/exports/missing/download', 'api/missing'] as $path) {
            $this->get('https://devmasters-api.onrender.com/'.$path, $this->forwardedHeaders())
                ->assertHeader('Vercel-CDN-Cache-Control', 'no-store');
        }
    }

    /** @return array<string, string> */
    private function forwardedHeaders(): array
    {
        return ['X-Forwarded-Host' => 'devmasters.dev', 'X-Forwarded-Proto' => 'https', 'X-Forwarded-Port' => '443'];
    }
}

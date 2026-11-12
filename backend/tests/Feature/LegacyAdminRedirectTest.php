<?php

namespace Tests\Feature;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LegacyAdminRedirectTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.url' => 'https://devmasters.dev',
            'devmasters.frontend_url' => 'https://devmasters.dev',
            'session.driver' => 'array',
        ]);
        TrustProxies::at('127.0.0.1');
        DB::shouldReceive('connection')->never();
    }

    #[DataProvider('legacyEntryPoints')]
    public function test_direct_legacy_admin_gets_a_temporary_equivalent_redirect_without_opening_a_session(string $method, string $path): void
    {
        $this->call($method, 'https://devmasters-api.onrender.com'.$path)
            ->assertStatus(302)
            ->assertRedirect('https://devmasters.dev'.rtrim($path, '/'))
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('CDN-Cache-Control', 'no-store')
            ->assertHeaderMissing('Set-Cookie');
    }

    public static function legacyEntryPoints(): array
    {
        return [
            'admin GET' => ['GET', '/admin'],
            'login GET' => ['GET', '/admin/login'],
            'admin HEAD' => ['HEAD', '/admin'],
            'login HEAD' => ['HEAD', '/admin/login'],
            'trailing slash' => ['GET', '/admin/login/'],
        ];
    }

    public function test_safe_query_context_is_preserved_and_credentials_return_urls_and_complex_values_are_dropped(): void
    {
        $this->get('https://devmasters-api.onrender.com/admin/login?locale=en&ref=a%26b&page=2'
            .'&token=private&email=person%40example.com&_token=private&next=https%3A%2F%2Fattacker.example'
            .'&session_id=private&signature=private&otp=private&password=private&filters[name]=private'
            .'&invalid=a%0Db&oversized='.str_repeat('a', 257))
            ->assertRedirect('https://devmasters.dev/admin/login?locale=en&ref=a%26b&page=2')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }

    public function test_legacy_hostname_matching_is_case_insensitive_and_accepts_the_standard_https_port(): void
    {
        $this->get('https://DEVMASTERS-API.ONRENDER.COM:443/admin/login')
            ->assertRedirect('https://devmasters.dev/admin/login');
    }

    public function test_public_request_and_both_trusted_proxy_header_formats_do_not_self_redirect(): void
    {
        $this->get('https://devmasters.dev/admin/login')->assertOk()->assertHeaderMissing('Location');

        $this->get('http://devmasters-api.onrender.com/admin/login', [
            'X-Forwarded-Host' => 'devmasters.dev',
            'X-Forwarded-Proto' => 'https',
            'X-Forwarded-Port' => '443',
        ])->assertOk()->assertHeaderMissing('Location');

        $this->get('http://devmasters-api.onrender.com/admin/login', [
            'X-Forwarded-Host' => 'devmasters-api.onrender.com',
            'X-Devmasters-Proxy-Host' => 'devmasters.dev',
            'X-Devmasters-Proxy-Proto' => 'https',
        ])->assertOk()->assertHeaderMissing('Location');
    }

    public function test_other_hosts_admin_subpaths_and_post_bodies_are_not_redirected(): void
    {
        $this->get('https://another.onrender.com/admin/login')->assertOk()->assertHeaderMissing('Location');
        Route::get('/admin/unchanged', fn () => response()->noContent());
        Route::post('/admin/login', fn () => response()->json(['received' => request('form_value')]));

        $this->get('https://devmasters-api.onrender.com/admin/unchanged')
            ->assertNoContent()->assertHeaderMissing('Location');
        $this->post('https://devmasters-api.onrender.com/admin/login', ['form_value' => 'unchanged'])
            ->assertOk()->assertJsonPath('received', 'unchanged')->assertHeaderMissing('Location');
    }

    public function test_health_api_and_csrf_endpoints_remain_available_on_the_render_origin(): void
    {
        $this->getJson('https://devmasters-api.onrender.com/api/health')
            ->assertOk()->assertExactJson(['status' => 'ok'])->assertHeaderMissing('Location');
        $this->get('https://devmasters-api.onrender.com/up')->assertOk()->assertHeaderMissing('Location');
        $this->get('https://devmasters-api.onrender.com/sanctum/csrf-cookie')
            ->assertNoContent()->assertCookie('XSRF-TOKEN')->assertHeaderMissing('Location');
        $this->getJson('https://devmasters-api.onrender.com/api/v1/auth/me')
            ->assertUnauthorized()->assertHeaderMissing('Location');
    }

    public function test_fixed_destination_cannot_be_changed_by_stale_configuration_or_a_public_host_forwarding_the_old_hostname(): void
    {
        config(['app.url' => 'https://devmasters-api.onrender.com', 'devmasters.frontend_url' => 'http://localhost:3000']);

        $this->get('https://devmasters-api.onrender.com/admin/login')
            ->assertRedirect('https://devmasters.dev/admin/login');

        $this->get('https://devmasters.dev/admin/login', [
            'X-Forwarded-Host' => 'devmasters-api.onrender.com',
        ])->assertOk()->assertHeaderMissing('Location');
    }
}

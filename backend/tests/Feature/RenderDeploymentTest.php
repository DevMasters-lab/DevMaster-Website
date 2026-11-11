<?php

namespace Tests\Feature;

use Tests\TestCase;

class RenderDeploymentTest extends TestCase
{
    public function test_health_is_public_and_does_not_open_a_session(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok'])
            ->assertHeaderMissing('Set-Cookie');
    }

    public function test_frontend_preflight_allows_credentials_and_csrf_headers(): void
    {
        config(['cors.allowed_origins' => ['https://website.devmasters.dev']]);

        $this->options('/api/v1/auth/login', [], [
            'Origin' => 'https://website.devmasters.dev',
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'content-type,x-xsrf-token,idempotency-key',
        ])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://website.devmasters.dev')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_unapproved_origin_is_never_reflected_in_cors_permission(): void
    {
        config(['cors.allowed_origins' => ['https://website.devmasters.dev']]);

        $this->getJson('/api/health', ['Origin' => 'https://untrusted.example'])
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', 'https://website.devmasters.dev');
    }

    public function test_csrf_cookie_endpoint_allows_the_frontend_origin(): void
    {
        config(['cors.allowed_origins' => ['https://website.devmasters.dev']]);

        $this->get('/sanctum/csrf-cookie', ['Origin' => 'https://website.devmasters.dev'])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://website.devmasters.dev')
            ->assertHeader('Access-Control-Allow-Credentials', 'true')
            ->assertCookie('XSRF-TOKEN');
    }
}

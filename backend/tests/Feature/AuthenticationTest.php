<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Support\WorkflowFixture as F;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_privileged_expert_cannot_bypass_mfa_through_the_expert_login_api(): void
    {
        $f = F::make();
        $f['user']->assignRole('ADMIN');
        $this->postJson('/api/v1/auth/login', ['email' => $f['user']->email, 'password' => 'Test-only-password-123!'])->assertUnprocessable();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }

    public function test_approved_user_can_establish_and_end_a_session(): void
    {
        $f = F::make();
        $this->postJson('/api/v1/auth/login', ['email' => $f['user']->email, 'password' => 'Test-only-password-123!'])->assertOk();
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.id', $f['user']->id);
        $this->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}

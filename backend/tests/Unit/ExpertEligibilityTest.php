<?php

namespace Tests\Unit;

use App\Models\ExpertProfile;
use App\Models\User;
use Tests\TestCase;

class ExpertEligibilityTest extends TestCase
{
    public function test_portal_eligibility_requires_all_independent_activation_conditions(): void
    {
        $user = new User(['status' => 'ACTIVE', 'email_verified_at' => now()]);
        $profile = new ExpertProfile(['application_status' => 'APPROVED', 'network_status' => 'ACTIVE', 'activated_at' => now()]);
        $user->setRelation('expertProfile', $profile);
        $this->assertTrue((bool) $user->isEligibleExpert());
        foreach (['application_status' => 'SUBMITTED', 'network_status' => 'SUSPENDED', 'activated_at' => null] as $field => $value) {
            $old = $profile->$field;
            $profile->$field = $value;
            $this->assertFalse((bool) $user->isEligibleExpert(), $field.' must deny access');
            $profile->$field = $old;
        }
        $user->status = 'DISABLED';
        $this->assertFalse((bool) $user->isEligibleExpert());
        $user->status = 'ACTIVE';
        $user->email_verified_at = null;
        $this->assertFalse((bool) $user->isEligibleExpert());
    }
}

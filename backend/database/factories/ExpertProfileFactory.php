<?php

namespace Database\Factories;

use App\Models\ExpertProfile;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ExpertProfileFactory extends Factory
{
    protected $model = ExpertProfile::class;

    public function definition(): array
    {
        $data = ['full_name' => fake()->name(), 'contact_email' => fake()->safeEmail(), 'professional_title' => 'Test specialist', 'biography' => 'A test professional profile for application review.'];

        return $data + ['expert_code' => 'TEST-'.Str::upper(Str::random(15)), 'application_status' => 'SUBMITTED', 'network_status' => 'PENDING', 'application_snapshot' => ['schema_version' => 1, 'data' => $data]];
    }
}

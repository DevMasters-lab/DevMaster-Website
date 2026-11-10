<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return ['display_name' => fake()->name(), 'email' => fake()->unique()->safeEmail(), 'password_hash' => 'Test-only-password-123!', 'status' => 'ACTIVE', 'email_verified_at' => now()];
    }
}

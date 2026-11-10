<?php

namespace Database\Factories;

use App\Models\CompanyRequest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CompanyRequestFactory extends Factory
{
    protected $model = CompanyRequest::class;

    public function definition(): array
    {
        $data = ['submitted_company_name' => fake()->company(), 'submitted_contact_name' => fake()->name(), 'submitted_email' => fake()->safeEmail(), 'title' => 'Test technical staffing request', 'requirements' => 'A test requirement for specialist technical services.'];

        return $data + ['reference_no' => 'TEST-'.Str::upper(Str::random(15)), 'request_type' => 'HIRE_OUR_TEAM', 'submission_snapshot' => ['schema_version' => 1, 'data' => $data]];
    }
}

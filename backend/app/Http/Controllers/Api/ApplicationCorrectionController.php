<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ApplicationCorrectionService;
use Illuminate\Http\Request;

class ApplicationCorrectionController extends Controller
{
    public function show(string $token, ApplicationCorrectionService $service)
    {
        return ['data' => $service->resolve($token)->only(['expert_code', 'full_name', 'professional_title', 'contact_phone', 'biography', 'location_text'])];
    }

    public function update(Request $r, string $token, ApplicationCorrectionService $service)
    {
        $d = $r->validate(['full_name' => 'required|string|max:200', 'professional_title' => 'required|string|max:200', 'contact_phone' => 'nullable|string|max:32', 'biography' => 'required|string|min:20|max:10000', 'location_text' => 'nullable|string|max:255', 'cv' => 'nullable|file|mimes:pdf,docx|max:10240']);
        $p = $service->submit($token, $d, $r->file('cv'));

        return ['data' => ['reference_no' => $p->expert_code, 'message' => __('Your corrections have been submitted for review.')]];
    }
}

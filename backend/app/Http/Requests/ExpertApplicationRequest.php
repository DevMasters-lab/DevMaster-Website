<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExpertApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['full_name' => 'required|string|max:200', 'contact_email' => 'required|email:rfc|max:254', 'contact_phone' => 'nullable|string|max:32', 'professional_title' => 'required|string|max:200', 'biography' => 'required|string|min:20|max:10000', 'location_text' => 'nullable|string|max:255', 'consent' => 'required|accepted', 'consent_version' => 'required|string|in:'.config('devmasters.consent_version'), 'cv' => 'required|file|mimes:pdf,docx|max:10240'];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['contact_email' => strtolower(trim($this->input('contact_email', '')))]);
    }
}

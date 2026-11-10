<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompanySubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['request_type' => ['required', Rule::in(['INVITE_US_TO_BID', 'HIRE_OUR_TEAM'])], 'submitted_company_name' => 'required|string|max:255', 'submitted_contact_name' => 'required|string|max:200', 'submitted_email' => 'required|email:rfc|max:254', 'submitted_phone' => 'nullable|string|max:32', 'title' => 'required|string|max:255', 'requirements' => 'required|string|min:20|max:20000', 'expected_start_on' => 'nullable|date_format:Y-m-d', 'expected_end_on' => 'nullable|date_format:Y-m-d|after_or_equal:expected_start_on', 'response_due_at' => 'nullable|date', 'attachments' => 'nullable|array|max:5', 'attachments.*' => 'file|mimes:pdf,docx,jpg,jpeg,png|max:10240'];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['submitted_email' => strtolower(trim($this->input('submitted_email', '')))]);
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OfferResponseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEligibleExpert() ?? false;
    }

    public function rules(): array
    {
        return ['response_type' => 'required|in:ACCEPTED,DECLINED,CHANGES_REQUESTED,COMMENT', 'comments' => 'nullable|string|max:10000', 'command_id' => 'required|uuid'];
    }
}

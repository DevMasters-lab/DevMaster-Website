<?php

namespace App\Http\Resources;

use App\Services\OfferService;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class OfferResource extends JsonResource
{
    public function toArray($request): array
    {
        return ['id' => $this->id, 'reference_no' => $this->reference_no, 'status' => $this->status, 'current_version_id' => $this->current_version_id, 'record_version' => $this->record_version, 'versions' => $this->whenLoaded('versions', fn () => $this->versions->filter(fn ($v) => $v->issued_at)->map(fn ($v) => ['id' => $v->id, 'version_no' => $v->version_no, 'status' => $v->status, 'terms_hash' => $v->terms_hash, 'issued_at' => $v->issued_at] + $v->only(OfferService::TERMS) + ['attachments' => DB::table('offer_documents')->join('document_versions', 'document_versions.id', '=', 'offer_documents.document_version_id')->where('offer_version_id', $v->id)->orderBy('sort_order')->get(['document_versions.id', 'original_filename', 'scan_status', 'sha256', 'size_bytes', 'label']), 'responses' => $v->responses->map(fn ($r) => $r->only(['id', 'response_type', 'comments', 'responded_at', 'channel']))])->values())];
    }
}

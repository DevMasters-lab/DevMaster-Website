<?php

namespace App\Http\Resources;

use App\Models\OfferVersion;
use App\Services\OfferService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference_no' => $this->reference_no,
            'status' => $this->status,
            'current_version_id' => $this->current_version_id,
            'record_version' => $this->record_version,
            'versions' => $this->whenLoaded('versions', fn () => $this->versions
                ->filter(fn (OfferVersion $version): bool => (bool) $version->issued_at)
                ->map(fn (OfferVersion $version): array => $this->versionData($version))
                ->values()),
        ];
    }

    /** @return array<string, mixed> */
    private function versionData(OfferVersion $version): array
    {
        return [
            'id' => $version->id,
            'version_no' => $version->version_no,
            'status' => $version->status,
            'terms_hash' => $version->terms_hash,
            'issued_at' => $version->issued_at,
        ] + $version->only(OfferService::TERMS) + [
            'attachments' => $version->offerDocumentsByOfferVersion->sortBy('sort_order')->values()
                ->map(fn ($attachment): array => $attachment->documentVersion
                    ->only(['id', 'original_filename', 'scan_status', 'sha256', 'size_bytes']) + ['label' => $attachment->label]),
            'responses' => $version->responses
                ->map(fn ($response): array => $response->only(['id', 'response_type', 'comments', 'responded_at', 'channel'])),
        ];
    }
}

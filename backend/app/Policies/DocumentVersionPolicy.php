<?php

namespace App\Policies;

use App\Models\DocumentVersion;
use App\Models\ExpertDocument;
use App\Models\ExpertOffer;
use App\Models\ExportJob;
use App\Models\OfferDocument;
use App\Models\OfferVersion;
use App\Models\User;

class DocumentVersionPolicy
{
    public function view(User $user, DocumentVersion $v): bool
    {
        if ($user->status !== 'ACTIVE' || $v->scan_status !== 'CLEAN') {
            return false;
        }
        if ($v->document->document_type === 'EXPORT') {
            $job = ExportJob::where('output_document_version_id', $v->id)->first();
            $permission = $job ? match ($job->export_type) {
                'REQUESTS' => 'requests.manage','OFFERS' => 'offers.prepare','PLACEMENTS' => 'placements.manage'
            } : null;

            return $job && $job->requested_by_user_id === $user->id && $job->status === 'COMPLETED' && $job->expires_at?->isFuture() && $user->can('reports.export') && $user->can($permission);
        }
        if ($user->status === 'ACTIVE' && $user->can('documents.view')) {
            return true;
        }
        if (! $user->isEligibleExpert()) {
            return false;
        }
        $p = $user->expertProfile;

        return ExpertDocument::where('expert_profile_id', $p->id)->where('document_id', $v->document_id)->exists() || OfferDocument::where('document_version_id', $v->id)->whereIn('offer_version_id', OfferVersion::whereNotNull('issued_at')->whereIn('offer_id', ExpertOffer::where('expert_profile_id', $p->id)->select('id'))->select('id'))->exists();
    }
}

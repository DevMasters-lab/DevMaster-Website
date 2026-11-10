<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\CompanyRequest;
use App\Models\DocumentVersion;
use App\Models\ExpertDocument;
use App\Models\ExpertOffer;
use App\Models\ExpertProfile;
use App\Models\OfferDocument;
use App\Models\OfferVersion;
use App\Models\OutreachRecord;
use App\Models\Placement;
use App\Models\RequestActivity;
use App\Models\RequestRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class AdminWorkflow
{
    public function updateRequest(User $actor, CompanyRequest $request, array $data): void
    {
        Gate::forUser($actor)->authorize('requests.manage');
        DB::transaction(function () use ($actor, $request, $data) {
            $r = CompanyRequest::lockForUpdate()->findOrFail($request->id);
            abort_unless($r->record_version === (int) $data['record_version'], 409, 'Request changed. Refresh first.');
            $old = $r->status;
            $r->update(array_intersect_key($data, array_flip(['status', 'requirements', 'organization_id', 'contact_id', 'owner_user_id'])) + ['closed_at' => in_array($data['status'], ['CLOSED', 'CANCELLED']) ? now() : null]);
            RequestActivity::create(['request_id' => $r->id, 'actor_type' => 'USER', 'actor_user_id' => $actor->id, 'activity_type' => 'STATUS_CHANGED', 'from_status' => $old, 'to_status' => $r->status, 'body' => $data['note'] ?? null]);
        });
    }

    public function addRole(User $actor, CompanyRequest $request, array $data): RequestRole
    {
        Gate::forUser($actor)->authorize('requests.manage');

        return RequestRole::create($data + ['request_id' => $request->id]);
    }

    public function shortlist(User $actor, CompanyRequest $request, ExpertProfile $expert, ?string $notes): Candidate
    {
        Gate::forUser($actor)->authorize('matching.manage');
        abort_unless($expert->application_status === 'APPROVED' && $expert->network_status === 'ACTIVE' && $expert->user?->isEligibleExpert(), 409, 'Expert must be approved and activated.');
        abort_if(in_array($request->status, ['CLOSED', 'CANCELLED']), 409, 'Request is closed.');

        return Candidate::firstOrCreate(['request_id' => $request->id, 'expert_profile_id' => $expert->id], ['shortlisted_by_user_id' => $actor->id, 'internal_notes' => $notes]);
    }

    public function outreach(User $actor, Candidate $candidate, array $data): OutreachRecord
    {
        Gate::forUser($actor)->authorize('matching.manage');

        return OutreachRecord::create($data + ['candidate_id' => $candidate->id, 'staff_user_id' => $actor->id]);
    }

    public function attach(User $actor, OfferVersion $v, DocumentVersion $file): void
    {
        Gate::forUser($actor)->authorize('offers.prepare');
        DB::transaction(function () use ($v, $file) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($v->offer_id);
            $v = OfferVersion::lockForUpdate()->findOrFail($v->id);
            abort_unless($o->current_version_id === $v->id && $v->status === 'DRAFT' && $file->scan_status === 'CLEAN', 409, 'Attachments require a current draft and CLEAN file.');
            abort_if(in_array($file->document->document_type, ['RESPONSE_EVIDENCE', 'EXPORT']), 403, 'Internal evidence and exports cannot be offered to experts.');
            if (in_array($file->document->document_type, ['CV', 'CERTIFICATE'])) {
                abort_unless(ExpertDocument::where('document_id', $file->document_id)->where('expert_profile_id', $o->expert_profile_id)->exists(), 403, 'Another expert’s private documents cannot be shared as offer attachments.');
            }OfferDocument::firstOrCreate(['offer_version_id' => $v->id, 'document_version_id' => $file->id]);
        });
    }

    public function saveDraft(User $actor, OfferVersion $v, array $terms): void
    {
        Gate::forUser($actor)->authorize('offers.prepare');
        DB::transaction(function () use ($v, $terms) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($v->offer_id);
            $v = OfferVersion::lockForUpdate()->findOrFail($v->id);
            abort_unless($o->current_version_id === $v->id && $v->status === 'DRAFT', 409, 'Only current draft terms may be edited.');
            abort_unless(isset($terms['record_version']) && $v->record_version === (int) $terms['record_version'], 409, 'Draft changed. Refresh before editing.');
            $v->update(array_intersect_key($terms, array_flip(OfferService::TERMS)));
        });
    }

    public function placementStatus(User $actor, Placement $p, string $status, string $reason): void
    {
        Gate::forUser($actor)->authorize('placements.manage');
        abort_unless(in_array($status, ['ACTIVE', 'ENDED']), 422, 'Use a selection correction to cancel a placement.');
        DB::transaction(function () use ($actor, $p, $status, $reason) {
            $p = Placement::lockForUpdate()->findOrFail($p->id);
            abort_unless(($p->status === 'CONFIRMED' && $status === 'ACTIVE') || ($p->status === 'ACTIVE' && $status === 'ENDED'), 409, 'Invalid placement transition.');
            $p->update(['status' => $status, 'actual_end_on' => $status === 'ENDED' ? today() : null, 'administrative_notes' => $reason]);
            app(BusinessEvents::class)->record('placement.'.$status, 'placement', $p->id, $actor, recipient: $p->expertProfile->user);
        });
    }
}

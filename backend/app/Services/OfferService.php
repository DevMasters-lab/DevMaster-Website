<?php

namespace App\Services;

use App\Models\Candidate;
use App\Models\CompanyRequest;
use App\Models\DocumentVersion;
use App\Models\ExpertOffer;
use App\Models\ExpertProfile;
use App\Models\OfferDocument;
use App\Models\OfferResponse;
use App\Models\OfferResponseEvidence;
use App\Models\OfferVersion;
use App\Models\Placement;
use App\Models\RequestRole;
use App\Models\SelectionDecision;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class OfferService
{
    public const TERMS = ['role_title', 'scope', 'work_mode', 'location_text', 'starts_on', 'ends_on', 'compensation_amount', 'currency', 'rate_basis', 'rate_basis_detail', 'payer_type', 'payer_name_snapshot', 'payment_terms', 'terms', 'expires_at'];

    public function draft(User $actor, array $data): ExpertOffer
    {
        Gate::forUser($actor)->authorize('offers.prepare');

        return DB::transaction(function () use ($actor, $data) {
            $candidate = Candidate::findOrFail($data['candidate_id']);
            $p = ExpertProfile::findOrFail($candidate->expert_profile_id);
            $this->eligible($p);
            $request = CompanyRequest::findOrFail($candidate->request_id);
            abort_if(in_array($request->status, ['CLOSED', 'CANCELLED']), 409, 'Request is closed.');
            $o = ExpertOffer::create(['reference_no' => 'DM-OF-'.Str::upper(Str::random(12)), 'candidate_id' => $candidate->id, 'request_id' => $candidate->request_id, 'expert_profile_id' => $candidate->expert_profile_id, 'request_role_id' => $data['request_role_id'] ?? null, 'responsible_user_id' => $actor->id]);
            $v = OfferVersion::create(['offer_id' => $o->id, 'version_no' => 1, 'created_by_user_id' => $actor->id] + array_intersect_key($data, array_flip(self::TERMS)));
            $o->update(['current_version_id' => $v->id]);

            return $o->refresh();
        });
    }

    public function issue(User $actor, ExpertOffer $offer, int $recordVersion): OfferVersion
    {
        Gate::forUser($actor)->authorize('offers.issue');

        return DB::transaction(function () use ($actor, $offer, $recordVersion) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($offer->id);
            abort_if(in_array($o->request->status, ['CLOSED', 'CANCELLED']), 409, 'Request is closed.');
            $this->optimistic($o, $recordVersion);
            $this->eligible($o->expertProfile);
            abort_if(Placement::where('offer_id', $o->id)->exists(), 409, 'Placement freezes this offer cycle.');
            $v = OfferVersion::lockForUpdate()->findOrFail($o->current_version_id);
            abort_unless($v->status === 'DRAFT', 409, 'Only current draft terms can be issued.');
            foreach (['role_title', 'scope', 'compensation_amount', 'currency', 'rate_basis', 'payer_type', 'payer_name_snapshot', 'payment_terms', 'terms', 'expires_at'] as $f) {
                abort_if($v->$f === null || trim((string) $v->$f) === '', 422, 'Required offer field: '.$f);
            }
            abort_unless(in_array($v->currency, config('devmasters.currencies')), 422, 'Currency is not enabled.');
            abort_unless($v->expires_at->isFuture(), 409, 'Offer expiry must be in the future.');
            $files = DocumentVersion::whereIn('id', OfferDocument::where('offer_version_id', $v->id)->pluck('document_version_id'))->orderBy('id')->get();
            foreach ($files as $file) {
                abort_unless($file->scan_status === 'CLEAN', 409, 'Every attachment must pass scanning.');
            }
            $terms = $v->only(self::TERMS);
            ksort($terms);
            $hash = hash('sha256', json_encode(['terms' => $terms, 'attachments' => $files->map(fn ($f) => ['id' => $f->id, 'sha256' => $f->sha256])->all()], JSON_THROW_ON_ERROR));
            $v->update(['issued_at' => now(), 'issued_by_user_id' => $actor->id, 'terms_hash' => $hash, 'status' => 'ISSUED']);
            $o->update(['status' => 'ISSUED']);
            app(BusinessEvents::class)->record('offer.issued', 'offer_version', $v->id, $actor, recipient: $o->expertProfile->user, data: ['reference_no' => $o->reference_no, 'version_no' => $v->version_no, 'message' => 'An offer is ready for your review.']);

            return $v->refresh();
        });
    }

    public function revise(User $actor, ExpertOffer $offer, int $recordVersion, array $terms): OfferVersion
    {
        Gate::forUser($actor)->authorize('offers.prepare');

        return DB::transaction(function () use ($actor, $offer, $recordVersion, $terms) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($offer->id);
            $this->optimistic($o, $recordVersion);
            abort_if(Placement::where('offer_id', $o->id)->exists(), 409, 'A placement freezes this offer cycle. Create a new offer.');
            $old = OfferVersion::lockForUpdate()->findOrFail($o->current_version_id);
            $old->update(['status' => 'SUPERSEDED']);
            $v = OfferVersion::create(['offer_id' => $o->id, 'version_no' => $old->version_no + 1, 'created_by_user_id' => $actor->id] + array_replace($old->only(self::TERMS), array_intersect_key($terms, array_flip(self::TERMS))));
            foreach (OfferDocument::where('offer_version_id', $old->id)->get() as $f) {
                DB::table('offer_documents')->insert(['offer_version_id' => $v->id, 'document_version_id' => $f->document_version_id, 'label' => $f->label, 'sort_order' => $f->sort_order]);
            }
            $o->update(['current_version_id' => $v->id, 'status' => 'DRAFT']);

            return $v;
        });
    }

    public function respond(User $actor, OfferVersion $version, array $data): OfferResponse
    {
        return DB::transaction(function () use ($actor, $version, $data) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($version->offer_id);
            $v = OfferVersion::lockForUpdate()->findOrFail($version->id);
            $channel = $data['channel'] ?? 'PORTAL';
            if ($channel === 'PORTAL') {
                abort_unless($actor->isEligibleExpert() && $o->expert_profile_id === $actor->expertProfile->id, 403, 'Offer does not belong to this expert.');
            } else {
                Gate::forUser($actor)->authorize('offers.record-response');
                abort_if(empty(trim($data['evidence_summary'] ?? '')), 422, 'Off-portal responses require attributed evidence.');
            }
            $this->eligible($o->expertProfile);
            $existing = OfferResponse::where('command_id', $data['command_id'])->first();
            if ($existing) {
                abort_unless($existing->offer_version_id === $v->id && $existing->recorded_by_user_id === $actor->id && $existing->response_type === $data['response_type'], 409, 'Command identifier already used.');

                return $existing;
            }
            abort_unless($o->current_version_id === $v->id && $v->status === 'ISSUED', 409, 'This offer version is no longer open.');
            // Database wall-clock after acquiring locks is authoritative at the deadline.
            $now = DB::selectOne('SELECT clock_timestamp() AS time')->time;
            abort_unless($v->expires_at && $v->expires_at->greaterThan($now), 409, 'This offer has expired.');
            $r = OfferResponse::create(['offer_version_id' => $v->id, 'response_type' => $data['response_type'], 'comments' => $data['comments'] ?? null, 'channel' => $channel, 'recorded_by_user_id' => $actor->id, 'responded_at' => $now, 'evidence_summary' => $data['evidence_summary'] ?? null, 'command_id' => $data['command_id']]);
            foreach ($data['evidence_version_ids'] ?? [] as $fileId) {
                abort_if($channel === 'PORTAL', 403, 'Evidence is staff-only.');
                $file = DocumentVersion::findOrFail($fileId);
                abort_unless($file->scan_status === 'CLEAN', 409, 'Evidence must be CLEAN.');
                OfferResponseEvidence::create(['offer_response_id' => $r->id, 'document_version_id' => $file->id]);
            }
            if ($data['response_type'] !== 'COMMENT') {
                $v->update(['status' => $data['response_type']]);
                $o->update(['status' => $data['response_type']]);
            }
            app(BusinessEvents::class)->record('offer.responded', 'offer_response', $r->id, $actor, recipient: $o->expertProfile->user, data: ['response_type' => $r->response_type]);

            return $r;
        }, 3);
    }

    public function decide(User $actor, ExpertOffer $offer, array $data): array
    {
        Gate::forUser($actor)->authorize('selections.decide');

        return DB::transaction(function () use ($actor, $offer, $data) {
            // Every selection takes locks in request -> role -> offer order.
            $request = CompanyRequest::lockForUpdate()->findOrFail($offer->request_id);
            if ($data['decision'] === 'SELECTED') {
                abort_if(in_array($request->status, ['CLOSED', 'CANCELLED']), 409, 'Request is closed.');
            }
            $role = $offer->request_role_id ? RequestRole::lockForUpdate()->findOrFail($offer->request_role_id) : null;
            $o = ExpertOffer::lockForUpdate()->findOrFail($offer->id);
            $v = OfferVersion::findOrFail($o->current_version_id);
            if (isset($data['expected_version_id'])) {
                abort_unless($v->id === $data['expected_version_id'], 409, 'Offer terms changed. Refresh before selecting.');
            }
            $this->eligible($o->expertProfile);
            $response = OfferResponse::where('offer_version_id', $v->id)->where('response_type', 'ACCEPTED')->first();
            abort_unless($v->status === 'ACCEPTED' && $response, 409, 'Selection requires acceptance of the current exact version.');
            $last = SelectionDecision::where('offer_id', $o->id)->orderByDesc('decision_no')->first();
            if ($last && $last->decision === $data['decision']) {
                return ['decision' => $last->toArray(), 'placement' => Placement::where('offer_id', $o->id)->first()?->toArray()];
            }
            if ($data['decision'] === 'SELECTED') {
                abort_if(Placement::where('offer_id', $o->id)->exists(), 409, 'This offer already has a placement cycle.');
                if ($role) {
                    abort_if($role->status === 'CANCELLED', 409, 'Requested role is cancelled.');
                    $count = Placement::whereIn('offer_id', ExpertOffer::where('request_role_id', $role->id)->select('id'))->where('status', '<>', 'CANCELLED')->count();
                    abort_if($count >= $role->headcount, 409, 'Role capacity reached.');
                }
            }
            $decision = SelectionDecision::create(['offer_id' => $o->id, 'offer_version_id' => $v->id, 'accepted_response_id' => $response->id, 'decision_no' => ($last?->decision_no ?? 0) + 1, 'decision' => $data['decision'], 'decided_by_user_id' => $actor->id, 'reason' => $data['reason'], 'supersedes_decision_id' => $last?->id]);
            $placement = Placement::where('offer_id', $o->id)->first();
            if ($data['decision'] === 'SELECTED') {
                $placement = Placement::create(['offer_id' => $o->id, 'offer_version_id' => $v->id, 'accepted_response_id' => $response->id, 'selection_decision_id' => $decision->id, 'request_id' => $o->request_id, 'expert_profile_id' => $o->expert_profile_id, 'company_name_snapshot' => $o->request->submitted_company_name, 'starts_on' => $v->starts_on, 'ends_on' => $v->ends_on, 'created_by_user_id' => $actor->id]);
                if ($role && $count + 1 >= $role->headcount) {
                    $role->update(['status' => 'FILLED']);
                }
            } elseif ($placement) {
                $placement->update(['status' => 'CANCELLED', 'administrative_notes' => $data['reason']]);
                if ($role && $role->status === 'FILLED') {
                    $role->update(['status' => 'OPEN']);
                }
            }
            app(BusinessEvents::class)->record('selection.decided', 'selection_decision', $decision->id, $actor, recipient: $o->expertProfile->user, data: ['decision' => $decision->decision]);

            return ['decision' => $decision->toArray(), 'placement' => $placement?->refresh()->toArray()];
        }, 3);
    }

    public function expire(ExpertOffer $offer): void
    {
        DB::transaction(function () use ($offer) {
            $o = ExpertOffer::lockForUpdate()->findOrFail($offer->id);
            $v = OfferVersion::lockForUpdate()->find($o->current_version_id);
            if ($v && $v->status === 'ISSUED' && $v->expires_at->isPast()) {
                $v->update(['status' => 'EXPIRED']);
                $o->update(['status' => 'EXPIRED']);
            }
        });
    }

    private function optimistic(ExpertOffer $o, int $version): void
    {
        abort_unless($o->record_version === $version, 409, 'Record changed. Refresh before continuing.');
    }

    private function eligible(ExpertProfile $p): void
    {
        abort_unless($p->application_status === 'APPROVED' && $p->network_status === 'ACTIVE' && $p->user?->isEligibleExpert(), 409, 'Expert must be approved and activated.');
    }
}

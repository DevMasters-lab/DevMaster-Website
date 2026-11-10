<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OfferResponseRequest;
use App\Http\Resources\OfferResource;
use App\Models\Availability;
use App\Models\ConsentRecord;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\ExpertDocument;
use App\Models\ExpertOffer;
use App\Models\ExpertProfile;
use App\Models\Notification;
use App\Models\OfferVersion;
use App\Models\Placement;
use App\Services\CommandService;
use App\Services\DocumentService;
use App\Services\OfferService;
use App\Support\Localization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class ExpertController extends Controller
{
    private function profile(Request $r): ExpertProfile
    {
        return $r->user()->expertProfile;
    }

    public function dashboard(Request $r)
    {
        $p = $this->profile($r);

        return ['data' => ['open_offers' => ExpertOffer::where('expert_profile_id', $p->id)->where('status', 'ISSUED')->count(), 'placements' => Placement::where('expert_profile_id', $p->id)->whereIn('status', ['CONFIRMED', 'ACTIVE'])->count(), 'unread_notifications' => Notification::where('recipient_user_id', $r->user()->id)->whereNull('read_at')->count(), 'profile' => $p->only(['full_name', 'professional_title', 'expert_code'])]];
    }

    public function showProfile(Request $r)
    {
        $profile = $this->profile($r)->load(['skills', 'availabilities']);
        $data = $profile->toArray();
        $data['skills'] = $profile->skills->map(fn ($skill) => array_replace($skill->toArray(), ['name' => Localization::content($skill, 'name')]))->all();

        return ['data' => $data];
    }

    public function updateProfile(Request $r)
    {
        $data = $r->validate(['record_version' => 'required|integer|min:1', 'full_name' => 'required|string|max:200', 'contact_phone' => 'nullable|string|max:32', 'professional_title' => 'nullable|string|max:200', 'biography' => 'nullable|string|max:10000', 'location_text' => 'nullable|string|max:255']);

        return DB::transaction(function () use ($r, $data) {
            $p = ExpertProfile::lockForUpdate()->findOrFail($this->profile($r)->id);
            abort_unless($p->record_version === $data['record_version'], 409, 'Profile changed. Refresh first.');
            unset($data['record_version']);
            $p->update($data);

            return ['data' => $p->refresh()];
        });
    }

    public function skills(Request $r)
    {
        $data = $r->validate(['record_version' => 'required|integer|min:1', 'skills' => 'present|array|max:50', 'skills.*.id' => 'required|uuid|distinct|exists:skills,id', 'skills.*.proficiency' => 'nullable|in:BEGINNER,INTERMEDIATE,ADVANCED,EXPERT', 'skills.*.years_experience' => 'nullable|numeric|min:0|max:999.9']);

        return DB::transaction(function () use ($r, $data) {
            $p = ExpertProfile::lockForUpdate()->findOrFail($this->profile($r)->id);
            abort_unless($p->record_version === $data['record_version'], 409, 'Profile changed. Refresh first.');
            $p->skills()->sync(collect($data['skills'])->mapWithKeys(fn ($v) => [$v['id'] => array_intersect_key($v, array_flip(['proficiency', 'years_experience']))])->all());
            $p->increment('record_version');

            return ['data' => $p->skills];
        });
    }

    public function availability(Request $r)
    {
        $data = $r->validate(['starts_on' => 'required|date_format:Y-m-d', 'ends_on' => 'nullable|date_format:Y-m-d|after_or_equal:starts_on', 'status' => 'required|in:AVAILABLE,LIMITED,UNAVAILABLE', 'hours_per_week' => 'nullable|numeric|min:0|max:168', 'notes' => 'nullable|string|max:2000']);

        return DB::transaction(function () use ($r, $data) {
            $p = ExpertProfile::lockForUpdate()->findOrFail($this->profile($r)->id);
            $exists = Availability::where('expert_profile_id', $p->id)->whereRaw("daterange(starts_on,ends_on,'[]') && daterange(?::date,?::date,'[]')", [$data['starts_on'], $data['ends_on'] ?? null])->exists();
            abort_if($exists, 409, 'Availability overlaps an existing interval.');

            return ['data' => Availability::create($data + ['expert_profile_id' => $p->id])];
        });
    }

    public function deleteAvailability(Request $r, Availability $availability)
    {
        abort_unless($availability->expert_profile_id === $this->profile($r)->id, 404);
        $availability->delete();

        return response()->noContent();
    }

    public function offers(Request $r)
    {
        $q = ExpertOffer::where('expert_profile_id', $this->profile($r)->id)->whereHas('versions', fn ($q) => $q->whereNotNull('issued_at'));
        if ($r->filled('status')) {
            $q->where('status', $r->query('status'));
        }

        return OfferResource::collection($q->with(['versions.responses'])->latest()->paginate(20));
    }

    public function offer(Request $r, ExpertOffer $offer)
    {
        abort_unless($offer->expert_profile_id === $this->profile($r)->id && $offer->versions()->whereNotNull('issued_at')->exists(), 404);

        return new OfferResource($offer->load('versions.responses'));
    }

    public function respond(OfferResponseRequest $r, OfferVersion $version, OfferService $offers, CommandService $commands)
    {
        abort_unless($version->offer->expert_profile_id === $this->profile($r)->id, 404);
        $data = $r->validated();
        $result = $commands->run('user:'.$r->user()->id, $r->header('Idempotency-Key', ''), 'offer.response:'.$version->id, $data, fn () => $offers->respond($r->user(), $version, $data + ['channel' => 'PORTAL'])->only(['id', 'offer_version_id', 'response_type', 'responded_at']));

        return ['data' => $result];
    }

    public function placements(Request $r)
    {
        return ['data' => Placement::where('expert_profile_id', $this->profile($r)->id)->latest()->get()->map(fn ($p) => $p->only(['id', 'offer_id', 'offer_version_id', 'company_name_snapshot', 'starts_on', 'ends_on', 'actual_end_on', 'status']))];
    }

    public function decisions(Request $r)
    {
        return ['data' => DB::table('selection_decisions')->whereIn('offer_id', ExpertOffer::where('expert_profile_id', $this->profile($r)->id)->select('id'))->orderByDesc('decided_at')->get(['id', 'offer_id', 'offer_version_id', 'decision_no', 'decision', 'decided_at'])];
    }

    public function notifications(Request $r)
    {
        return ['data' => Notification::where('recipient_user_id', $r->user()->id)->latest()->paginate(30)->through(fn ($notice) => array_replace($notice->only(['id', 'notification_type', 'title', 'body', 'action_path', 'read_at', 'created_at']), ['title' => Localization::content($notice, 'title'), 'body' => Localization::content($notice, 'body')]))];
    }

    public function readNotification(Request $r, Notification $notification)
    {
        abort_unless($notification->recipient_user_id === $r->user()->id, 404);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return ['data' => $notification];
    }

    public function documents(Request $r)
    {
        return ['data' => Document::whereIn('id', ExpertDocument::where('expert_profile_id', $this->profile($r)->id)->select('document_id'))->with(['versions' => fn ($q) => $q->select(['id', 'document_id', 'version_no', 'original_filename', 'mime_type', 'size_bytes', 'scan_status', 'uploaded_at'])])->get()];
    }

    public function upload(Request $r, DocumentService $docs)
    {
        $r->validate(['file' => 'required|file|mimes:pdf,docx,jpg,jpeg,png|max:10240', 'purpose' => 'required|in:CV,CERTIFICATE,OTHER', 'document_id' => 'nullable|uuid']);

        return DB::transaction(function () use ($r, $docs) {
            $p = $this->profile($r);
            $d = null;
            if ($r->document_id) {
                abort_unless(ExpertDocument::where('expert_profile_id', $p->id)->where('document_id', $r->document_id)->exists(), 404);
                $d = Document::findOrFail($r->document_id);
            }$v = $docs->upload($r->file('file'), $r->purpose, $r->user(), $d);
            if (! $d) {
                ExpertDocument::create(['expert_profile_id' => $p->id, 'document_id' => $v->document_id, 'purpose' => $r->purpose, 'linked_by_user_id' => $r->user()->id]);
            }

            return ['data' => $v->only(['id', 'document_id', 'scan_status', 'version_no'])];
        });
    }

    public function download(Request $r, DocumentVersion $version)
    {
        Gate::authorize('view', $version);

        return Storage::disk('private')->download($version->object_key, $version->original_filename, ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }

    public function consents(Request $r)
    {
        return ['data' => ConsentRecord::where('expert_profile_id', $this->profile($r)->id)->orderByDesc('occurred_at')->get(['id', 'purpose', 'policy_version', 'policy_text_snapshot', 'action', 'occurred_at'])];
    }

    public function consent(Request $r)
    {
        $d = $r->validate(['purpose' => 'required|in:NETWORK_PARTICIPATION,CV_SHARING', 'action' => 'required|in:GRANTED,WITHDRAWN', 'policy_version' => 'required|in:'.config('devmasters.consent_version')]);

        return DB::transaction(function () use ($r, $d) {
            $p = ExpertProfile::lockForUpdate()->findOrFail($this->profile($r)->id);
            $c = ConsentRecord::create($d + ['expert_profile_id' => $p->id, 'policy_text_snapshot' => __(config($d['purpose'] === 'CV_SHARING' ? 'devmasters.cv_sharing_text' : 'devmasters.consent_text')), 'channel' => 'PORTAL', 'recorded_by_user_id' => $r->user()->id]);
            if ($d['purpose'] === 'NETWORK_PARTICIPATION' && $d['action'] === 'WITHDRAWN') {
                $p->update(['network_status' => 'SUSPENDED']);
            }

            return ['data' => $c];
        });
    }
}

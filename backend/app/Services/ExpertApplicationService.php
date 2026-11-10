<?php

namespace App\Services;

use App\Models\Document;
use App\Models\ExpertDocument;
use App\Models\ExpertProfile;
use App\Models\ExpertReview;
use App\Models\User;
use App\Support\Localization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ExpertApplicationService
{
    public function review(User $actor, ExpertProfile $profile, array $data): ExpertReview
    {
        Gate::forUser($actor)->authorize('experts.review');

        return DB::transaction(function () use ($actor, $profile, $data) {
            $profile = ExpertProfile::lockForUpdate()->findOrFail($profile->id);
            $documents = Document::whereIn('id', ExpertDocument::where('expert_profile_id', $profile->id)->select('document_id'))->with('versions')->get();
            $refs = [];
            foreach ($documents as $document) {
                $latest = $document->versions->sortByDesc('version_no')->first();
                if ($data['decision'] === 'APPROVED') {
                    abort_unless($latest && $latest->scan_status === 'CLEAN', 409, 'Approval requires all current application documents to pass scanning.');
                }if ($latest && $latest->scan_status === 'CLEAN') {
                    $refs[] = ['id' => $latest->id, 'sha256' => $latest->sha256];
                }
            }
            $review = ExpertReview::create(['expert_profile_id' => $profile->id, 'reviewer_user_id' => $actor->id, 'decision' => $data['decision'], 'comments' => $data['comments'] ?? null, 'feedback_to_expert' => $data['feedback_to_expert'] ?? null, 'reviewed_profile_snapshot' => $profile->toArray(), 'reviewed_document_refs' => $refs]);
            $profile->update(['application_status' => $data['decision'], 'approved_at' => $data['decision'] === 'APPROVED' ? now() : null, 'network_status' => 'PENDING']);
            app(BusinessEvents::class)->record('application.reviewed', 'expert_profile', $profile->id, $actor, $profile->contact_email, data: ['decision' => $data['decision']]);

            return $review;
        });
    }

    public function invite(User $actor, ExpertProfile $profile): User
    {
        Gate::forUser($actor)->authorize('experts.activate');

        return DB::transaction(function () use ($actor, $profile) {
            $p = ExpertProfile::lockForUpdate()->findOrFail($profile->id);
            abort_unless($p->application_status === 'APPROVED', 409, 'Approve the application before invitation.');
            if ($p->user_id) {
                return $p->user;
            }
            abort_if(User::where('email', strtolower($p->contact_email))->exists(), 409, 'Email is already linked to an account; resolve identity manually.');
            $u = User::create(['email' => strtolower($p->contact_email), 'display_name' => $p->full_name, 'status' => 'INVITED', 'preferred_locale' => Localization::valid($profile->application_snapshot['locale'] ?? null) ? $profile->application_snapshot['locale'] : 'km']);
            $u->assignRole('EXPERT');
            $p->update(['user_id' => $u->id]);
            app(BusinessEvents::class)->record('expert.invited', 'user', $u->id, $actor, $u->email, data: ['message' => 'Your application is approved. Request an account setup link from the sign-in page.']);

            return $u;
        });
    }
}

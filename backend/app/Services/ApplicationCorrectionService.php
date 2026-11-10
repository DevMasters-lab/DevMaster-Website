<?php

namespace App\Services;

use App\Models\ExpertDocument;
use App\Models\ExpertProfile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ApplicationCorrectionService
{
    public function link(ExpertProfile $p): string
    {
        abort_unless($p->application_status === 'CORRECTIONS_REQUIRED' && ! $p->user_id, 409, 'Application is not open for public corrections.');
        $token = Str::random(64);
        Cache::put('application-correction:'.hash('sha256', $token), $p->id, now()->addHours(48));

        return config('devmasters.frontend_url').'/application-corrections/'.$token;
    }

    public function resolve(string $token): ExpertProfile
    {
        abort_unless(preg_match('/^[A-Za-z0-9]{64}$/', $token), 404);
        $id = Cache::get('application-correction:'.hash('sha256', $token));
        abort_unless($id, 404, 'This correction link is invalid or expired.');
        $p = ExpertProfile::findOrFail($id);
        abort_unless($p->application_status === 'CORRECTIONS_REQUIRED' && ! $p->user_id, 409, 'This application is no longer open for corrections.');

        return $p;
    }

    public function submit(string $token, array $data, ?UploadedFile $cv): ExpertProfile
    {
        return DB::transaction(function () use ($token, $data, $cv) {
            $p = $this->resolve($token);
            $p = ExpertProfile::lockForUpdate()->findOrFail($p->id);
            abort_unless($p->application_status === 'CORRECTIONS_REQUIRED', 409, 'Corrections already submitted.');
            $p->update(array_intersect_key($data, array_flip(['full_name', 'contact_phone', 'professional_title', 'biography', 'location_text'])) + ['application_status' => 'SUBMITTED']);
            if ($cv) {
                $v = app(DocumentService::class)->upload($cv, 'CV');
                ExpertDocument::create(['expert_profile_id' => $p->id, 'document_id' => $v->document_id, 'purpose' => 'CV']);
            }app(BusinessEvents::class)->record('application.corrected', 'expert_profile', $p->id, null, $p->contact_email, data: ['reference_no' => $p->expert_code]);
            DB::afterCommit(fn () => Cache::forget('application-correction:'.hash('sha256', $token)));

            return $p;
        });
    }
}
